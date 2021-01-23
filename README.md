# What is this?

This is a Javascript game framwork that helps us creating 3D VR Web games. It uses three.js for the 3D rendering.

# Installation

`npm i verne-engine --save`

# Instructions

```
import { APP } from "verne-engine";


    let player = new APP.Player();

    player.load(scene);
    player.setSize(window.innerWidth, window.innerHeight);

    player.onGameStart(GamePlay); //use this hook to pass a function and programm the game.

    player.play();

    document.querySelector("#App").appendChild(player.dom);

    window.addEventListener("resize", function () {
      player.setSize(window.innerWidth, window.innerHeight);
    });


```
