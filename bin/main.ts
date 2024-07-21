#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as ssm from "aws-cdk-lib/aws-ssm";
import { MainStack } from '../lib/main-stack';

const app = new cdk.App();

const accountId = ssm.StringParameter.valueForStringParameter(app, '/account/id/admin');
const region = ssm.StringParameter.valueForStringParameter(app, '/account/region/admin');

new MainStack(app, 'FrontendStack', {
  env: { account: accountId, region: region },
});