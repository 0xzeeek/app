/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */
import "sst"
export {}
declare module "sst" {
  export interface Resource {
    "AgentImage": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "CharacterFile": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "CreateAgent": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
    "Next": {
      "type": "sst.aws.Nextjs"
      "url": string
    }
    "RateLimitData": {
      "name": string
      "type": "sst.aws.Dynamo"
    }
  }
}
