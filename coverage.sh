NODE_ENV=test TEST_REMOTE_SERVICES=no node node_modules/istanbul/lib/cli.js cover node_modules/.bin/_mocha -- -R spec
open coverage/lcov-report/index.html
