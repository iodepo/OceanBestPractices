# Virtuoso Triple Store

The Virtuoso Triple Store instance is running on an EC2 instance and can be launched by a Cloud Formation template.


### Overview

- Creating a Virtuoso Stack
    - Docker Image
- Importing OWL Ontology
    - Importing a Large OWL Ontology (Bulk Loading)
- Importing SKOS Vocabulary

## Creating a Virtuoso Stack

You can launch new instances of Virtuoso for recovery or testing purposes by launching a new cloudformation stack:

```
aws cloudformation deploy --template-file virtuoso-instance.yml --stack-name {NAME} --parameter-overrides VpcId={VPCID} Environment={ENVIRONMENT} KeyPairName={KEY_PAIR} --profile {AWS_PROFILE}
```

There are other parameters you can provide. Please refer to the CloudFormation template for details.

This stack creates an EC2 instance and spins up an instance of Virtuoso within a Docker Container. It also creates a Security Group which will allow HTTP access to port 8890 (Virtuoso default) and SSH access.

The template provides a base virtuoso.ini file and can be configured within the template if any of the default parameters should be changed.

### Docker Image

The Docker image used for our instance of Virtuoso can be found here:

[https://hub.docker.com/r/openlink/virtuoso_opensource/]

## Importing OWL Ontology

Loading a small ontology is easy if a `.owl` file is available. Navigate to the Virtuoso Conductor and choose _Database -> Interactive SQL_. In the SQL console, you can load a `.owl` file by executing a command similar to:

```
SPARQL LOAD <http://purl.unep.org/sdg/sdgio.owl>;
```

## Importing a Large OWL Ontology (Bulk Loading)

Example for bulk loading an RDF file. This was used to load the CHEBI ontology.

[http://vos.openlinksw.com/owiki/wiki/VOS/VirtBulkRDFLoaderExampleSingle]

Loading the Bulk Loader Procedure for Virtuoso.

[http://vos.openlinksw.com/owiki/wiki/VOS/VirtBulkRDFLoaderScript]

## Importing SKOS Vocabulary

Loading an RDF/XML SKOS vocabulary is easy once you've SSH'd into the Virtuoso instance. Secure copy the vocabulary to the Virtuoso instance:

```
> scp -i keys/{your key} vocab.xml ec2-user@{host}:~/
```
SSH to the instance and copy the vocabulary file into the docker container.

```
> sudo docker cp vocab.xml vos:/opt/virtuoso-opensource/database/
```

Start a bash session in the Virtuoso docker container and start isql:

```
> sudo docker exec -it vos bash
> /opt/virtuoso-opensource/bin/isql 1111
```

Follow the instructions here for loading the vocabulary:

[http://docs.openlinksw.com/virtuoso/fn_rdf_load_rdfxml_mt/]
