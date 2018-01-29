# Doc synchronization

This document contains an example on how to use synchronize documents between multiple QIX Engine instances in Qlik Core.
The orchestration used in this example is `Kubernetes`.

To better visualize the synchronization this example contains two running QIX Engine instances deployed as two separate services.
This is to ensure that the example uses both QIX engine instances and that sessions are not balanced by Kubernetes built-in loadbalancer.

## Description

This example will use a [Persistent Volume](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) in `Kubernetes`,
which will be shared between the two QIX Engine instances. The synchronization between the QIX Engines will be handled by a message
broker called [RabbitMQ](https://www.rabbitmq.com/). When a document is updated e.g. data has been reloaded or new documents were created,
events will be placed in a queue that both instances are subscribing to.

## Prerequisites

To be able to run this example you will need to have `Minikube` or similar, and `Kubernetes` installed locally.

Since QIX Engine instances uses `nobody` as running user in the docker container,
the appropriate permissions must be set on the storage that will be used for the documents.
Run the following command to create the document storage folder in minikube.

```sh
minikube ssh 'sudo mkdir /tmp/docs;sudo chmod o+rw /tmp/docs'
```

To be able to access some of the docker images used in this example you also need to add a kubernetes secret with your docker credentials.

```sh
kubectl create secret docker-registry dockerhub --docker-username=<your-name> --docker-password=<your-password> --docker-email=<your-email>
```

## Running the example

Deploy the example:

```sh
kubetcl create -f ./core
```

Remove the deployment:

```sh
kubectl delete -f ./core
```
