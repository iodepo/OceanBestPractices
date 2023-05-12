# OpenSearch

The search and tags indexes are powered by [OpenSearch](https://us-east-1.console.aws.amazon.com/opensearch) and hosted and managed in AWS. For security reasons the search index instance is a private subnet and can only be reached through a bastion EC2 instance. The bastion is automatically configured and launched by the deployment scripts.

This document discusses configuring your local environment so that you can access the OpenSearch instance. For information about how the search and tags indexes are used see the [ingest](./ingest/README.md) and [search API](./api/README.md) documentation.

## Configuring the Bastion for SSH

If this is a newly deployed instance you first need to add your SSH key to the instance's authorized keys file:

Connecting to the EC2 instance:

```sh
aws ssm start-session --target {EC2_INSTANCE_ID} --profile {AWS_PROFILE}
```

Next, switch to the ec2-user:

```sh
sudo su - ec2-user
```

Then add your public SSH key to the ec2-user's `.ssh/authorized_keys` file.

## Executing Searches Locally

In order to proxy requests to the search index we use a utility called [aws-es-proxy-1.3-linux-amd64](https://github.com/abutaha/aws-es-proxy).


If this is a newly deployed EC2 instance you'll need to push the linux binary to the bastion:

```sh
scp aws-es-proxy-1.3-linux-386 ec2-user@{EC2_PUBLIC_IP}:~`
```

Once the proxy binary has been uploaded to the bastion you'll need to follow these instructions for connecting to the search Index.

Start an ssm session with the bastion in order to start the proxy (if doing this for the first time you might have to make sure the binary is executable):

```sh
aws ssm start-session --target {EC2_INSTANCE_ID} --profile {AWS_PROFILE}
sudo su - ec2-user
chmod +x aws-es-proxy-1.3-linux-386
./aws-es-proxy-1.3-linux-386 --endpoint {SEARCH_INDEX_ENDPOINT}
```

Next we just need to forward the right ports from our local machine:

```sh
aws ssm start-session --target {EC_INSTANCE_ID} --document-name AWS-StartPortForwardingSession --parameters '{"portNumber":["9200"], "localPortNumber":["8200"]}' --profile {AWS_PROFILE}
```

Now using your HTTP client of choice you can reach the search index at https://localhost:8200
