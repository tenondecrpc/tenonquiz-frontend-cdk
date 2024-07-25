import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipelineActions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class WebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const repositoryArn = ssm.StringParameter.valueFromLookup(this, '/my/application/connection/repository/arn');
    const repositoryOwner = ssm.StringParameter.valueFromLookup(this, '/my/application/connection/repository/owner');
    const repositoryName = ssm.StringParameter.valueFromLookup(this, '/my/application/connection/repository/frontend/name');
    const repositoryBranch = ssm.StringParameter.valueFromLookup(this, '/my/application/connection/repository/frontend/branch');
    const webBucketName = ssm.StringParameter.valueFromLookup(this, '/my/application/web/bucket/name');

    const bucket = new s3.Bucket(this, webBucketName, {
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const webpPipeline = new codepipeline.Pipeline(this, "WebPipeline", {
      pipelineName: `web-app`,
    });

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipelineActions.CodeStarConnectionsSourceAction({
      actionName: "GithubCommit",
      connectionArn: repositoryArn,
      owner: repositoryOwner,
      repo: repositoryName,
      branch: repositoryBranch,
      output: sourceOutput,
    });

    const project = new codebuild.PipelineProject(this, "WebProject", {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        env: {
          shell: "bash",
        },
        phases: {
          pre_build: {
            commands: ["echo $CODEBUILD_RESOLVED_SOURCE_VERSION", "npm install"],
          },
          build: {
            commands: ["echo Build started on `date`", "npm run build"],
          },
          post_build: {
            commands: ["echo Build completed on `date`"],
          },
        },
        artifacts: {
          files: ["**/*"],
          "base-directory": "dist",
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
        computeType: codebuild.ComputeType.MEDIUM,
      },
    });

    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipelineActions.CodeBuildAction({
      actionName: "CodeBuild",
      project,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const deployAction = new codepipelineActions.S3DeployAction({
      actionName: "DeployAction",
      bucket,
      input: buildOutput,
    });

    webpPipeline.addStage({
      stageName: "Source",
      actions: [sourceAction],
    });
    webpPipeline.addStage({
      stageName: "Build",
      actions: [buildAction],
    });
    webpPipeline.addStage({
      stageName: "Deploy",
      actions: [deployAction],
    });
  }
}
