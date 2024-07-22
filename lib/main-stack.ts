import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import { WebStage } from "./web-stage";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repositoryArn = ssm.StringParameter.valueFromLookup(this, '/my/application/connection/repository/arn');
    const repositoryName = ssm.StringParameter.valueFromLookup(this, '/my/application/connection/repository/infra/web/name');
    const repositoryBranch = ssm.StringParameter.valueFromLookup(this, '/my/application/connection/repository/infra/web/branch');
    const accountIdDeploy = ssm.StringParameter.valueFromLookup(this, '/account/id/deploy');
    const regionDeploy = ssm.StringParameter.valueFromLookup(this, '/account/region/deploy');

    const pipeline = new pipelines.CodePipeline(this, "Web", {
      crossAccountKeys: true,
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.connection(
          repositoryName,
          repositoryBranch,
          {
            connectionArn: repositoryArn,
          }
        ),
        commands: ["npm ci", "npm run build", "npx cdk synth"],
      }),
    });

    pipeline.addStage(
      new WebStage(this, "WebStage", {
        env: { account: accountIdDeploy, region: regionDeploy },
      })
    );

    pipeline.buildPipeline();

    // TODO: Improve role grant for get parameter store
    const pipelineRole = pipeline.pipeline.role;
    const parameterStorePolicy = new iam.PolicyStatement({
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParametersByPath'
      ],
      resources: [`arn:aws:ssm:${props?.env?.region}:${props?.env?.account}:parameter/*`]
    });
    pipelineRole.addToPrincipalPolicy(parameterStorePolicy);

    pipeline.pipeline.artifactBucket.grantRead(new iam.AccountPrincipal(accountIdDeploy));
  }
}
