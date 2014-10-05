# Backbeam server

[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/backbeam/backbeam-server?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Backbeam-server is a compatible implementation of [Backbeam.io](http://backbeam.io), a cloud backend-as-a-service. This project is maintained by the creators of Backbeam and this project will pass similar tests to keep its compatibility.

## Introduction

### Why an Open Source version?

We want our customers to be happy and one of the things that most worry our customers is the vendor-lockin problem. Providing an Open Source implementation solves this problem.

Another important reason is flexibility. Having the opportunity to host your own backbeam-compatible stack you can do many things such as:

- You can install `backbeam-server` in your Continuous Integration server for testing purpouses
- If you are developing a new SDK for Backbeam.io you can test it locally with `backbeam-server`.
- Soon you will be able to dump your data from Backbeam.io to your machines and import the data to a local instance to inspect the data carefully for: machine learning, data mining, reporting, pattern-finding, etc.

### What does it differ from backbeam.io?

There are many differences in the implementation.

- Our plans for `backbeam-server` is to support many databases such as `redis`, `mysql` and `postgresql`.
- `backbeam-server` doesn't come with a control panel but you can use your preferred database inspector for administration purposes.
- In Backbeam.io you can change your data model in the control panel easily thanks to the schema-less nature of the NoSQL databases we use. In `backbeam-server` could be a little more manual.
- Finally with `backbeam-server` you will have to implement your infrastructure to support scalability, backups, server configuration, security protection, etc.

## Usage

Work in progress.

## What does it support?

Both backbeam.io and backbeam-shed provide the following features

- Database
- REST API (with Open Source SDKs for iOS, Android and JavaScript)
- Users authentication (email+password, Twitter, Facebook or Google+)
- Push notifications for iOS and Android
- Server-side code execution in JavaScript
- Full-featured MVC web framework
- A real-time API
