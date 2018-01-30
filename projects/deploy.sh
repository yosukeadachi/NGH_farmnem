#!/bin/bash
SCRIPT_DIR=$(cd $(dirname $0); pwd)
sed -i '' "s/@MGRPRIVATEKEY@/$1/" $SCRIPT_DIR/routes/index.js

pushd $SCRIPT_DIR
cf push farmnem-webfront
popd