#!/bin/bash

VERSION=$(git describe --tags --always)
COMMIT=$(git rev-parse --short HEAD)

mkdir -p public
echo "{ \\"version\\": \\"$VERSION\\", \\"tag\\": \\"$VERSION\\", \\"commit\\": \\"$COMMIT\\" }" > public/version.json
