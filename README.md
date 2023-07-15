[Topic](https://forum.babylonjs.com/t/the-debug-drawer-for-box2d-wasm-using-babylon-js-and-javascript/42468)

Playgrounds:

- Babylon.js Playground: https://playground.babylonjs.com/#7ICSL2#1
- Plunker: https://plnkr.co/edit/J1sIepjuDudJQjyW?preview
- Glitch: https://glitch.com/edit/#!/rambunctious-low-axolotl

Instruction for building and running the project in debug and release using Rollup:

- Install these packages globally with the command:

> npm i -g http-server rollup uglify-js

- Run http-server in the project directory:

> http-server -c-1

Note. The `-c-1` key allows you to disable caching.

- Start development mode with the following command:

> npm run dev

Note. Rollup will automatically keep track of saving changes to files and build a new index.js file ready for debugging. You can debug your project step by step in the browser by setting breakpoints.

- Go to the browser and type the address: localhost:8080/index.html

- Create a compressed file ready for publishing. Stop development mode, for example, with this command Ctrl + C in CMD, if it was launched before and enter the command:

> npm run release

Note. After this command, Rollup will create a compressed index.js file. Compression is done using the uglify-js package.
