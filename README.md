# Qlik Associative Engine Document Synchronization

[![CircleCI](https://circleci.com/gh/qlik-oss/core-document-synchronization.svg?style=shield)](https://circleci.com/gh/qlik-oss/core-document-synchronization)

This git repository contains an example on how to synchronize documents between multiple Qlik Associative Engine instances in Qlik Core. It also contains a small test scenario, implemented with [enigma.js](https://github.com/qlik-oss/enigma.js/), to verify document synchronization between engine instances. Container orchestration in this example is managed with [Kubernetes]( https://kubernetes.io/).

To get a clearer picture of document synchronization, the two  Qlik Associative Engine instances are deployed as separate services.
This setup ensures that both engine instances are used, and that the sessions are not balanced by Kubernetes built-in load balancer.

## Description

In this example, a Kubernetes [Persistent Volume](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) is shared between the two Qlik Associative Engine instances.
To manage document synchronization, Qlik Core looks for document changes on the shared volume. 
If changes to data blobs, objetcs, variables, dimensions, or measures are detected, all existing sessions towards the document are updated, regardless of which engine instance is being used.

## Prerequisites

To run this example, you need to have [Minikube](https://github.com/kubernetes/minikube) (or equivalent) and Kubernetes installed locally.

Since Qlik Associative Engine instances use `nobody` as the running user in the docker container,
you must set the appropriate permissions for doucment storage.

To create the document storage folder in Minikube, run the following command:

```sh
minikube ssh 'sudo mkdir -p /data/docs;sudo chmod o+rw /data/docs'
```

## Deploying the example

To deploy the example, run the following command:

```sh
kubectl create -f example
```

## Testing document synchronization

The test scenario runs through the following steps:

1. Create a document in the first Qlik Associative Engine instance.

1. Open the previously created document in the second Qlik Associative Engine instance.

1. Set a script and perform a reload in the second Qlik Associative Engine instance.

1. Open a session to the document again in the first Qlik Associative Engine and verify reload time.

To execute the test locally, run the following commands:

```sh
cd test
npm install
ENGINE1=<URL to Qlik Associative Engine> ENGINE2=<URL to Qlik Associative Engine> npm run test
```

!!! Note
    You can retrieve the url to an engine by running `minikube service engine --url`. The service name used for the query is specified       in `*-service.yaml`.

The test scenario is also part of the Circle CI pipeline and executed for each commit to this repository. For more details, look at the Circle CI [config](./.circleci/config.yml) file.

## Removing the deployment

To remove the deployment, run the following command:

```sh
kubectl delete -f example
```
