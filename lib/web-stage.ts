import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { WebStack } from "./web-stack";

export class WebStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    new WebStack(this, "WebStack");
  }
}
