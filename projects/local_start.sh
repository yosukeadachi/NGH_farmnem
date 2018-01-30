#!/bin/bash
sed -i '' "s/@MGRPRIVATEKEY@/$1/" routes/index.js
npm start
