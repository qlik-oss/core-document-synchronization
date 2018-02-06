FROM node:8-alpine

# Handle env variables
ARG ENGINE1
ENV ENGINE1 $ENGINE1

ARG ENGINE2
ENV ENGINE2 $ENGINE2

# Create test directory
RUN mkdir -p /test/
WORKDIR /test/

# Bundle test and depencencies
COPY package*.json ./
RUN npm install --quiet
COPY *.spec.js ./


# Execute tests
CMD [ "npm", "run", "test" ]
