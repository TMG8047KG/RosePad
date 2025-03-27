# RosePad
![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads-pre/TMG8047KG/RosePad/latest/total?style=flat-square&label=Download%40Latest&color=green)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/TMG8047KG/RosePad/main.yml?style=flat-square)
![AUR Version](https://img.shields.io/aur/version/rosepad?label=AUR&style=flat-square)
![GitHub Tag](https://img.shields.io/github/v/tag/TMG8047KG/RosePad?style=flat-square&label=Tag)
<br>
A simple cross-platform text editor made for writing notes, letters, poems, and such with ease with a beautiful UI.

<a href="https://apps.microsoft.com/detail/9NLLN9DJM147?mode=direct">
	<img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200"/>
</a>

###

> [!NOTE]
> This is still in development and everything you see is a subject to change and it can change at any time.

---
### Idea
The idea behind this project is to combine the simplicity and style from the Notepad and the text formatting functions of Microsoft Word, while being able to handle all or most of the text file extensions in one app.
The reason for this is because I got pissed at how I couldn't style my text in Notepad and I then switched to Word, which is just too cluttered and awful to work with, so here are we.

---

### Supported Platforms
All supported platforms and the app's working status on that platforms.

| **Platforms** 	| **Supported** 	| **Tested** 	|
|:-------------:	|:-------------:	|:----------:	|
|    Windows    	|       ✅       	|      ✅     	|
|     Linux     	|       ✅       	|  Partially  	|
|     MacOS     	|       ✅       	|      ❌     	|
|    Android    	|       ❌       	|      ❌     	|
|      IOS      	|       ❌       	|      ❌     	|
> [!NOTE]
> On some versions or distros of Linux you might need to do extra steps after you download it to get it to work.

> [!CAUTION]
> If you are using RosePad on one of the untested platforms there is a chance something unexpected to happen and break or just not work! <br>
> If that happens, please contact me or report the [issue](https://github.com/TMG8047KG/RosePad/issues)

---

### How to build the app from the source
> [!NOTE]
> This app is developed using Tauri v2 in combination with React and Typescript.

Firstly, you will need to [install `pnpm`](https://pnpm.io/installation), [node.js](https://nodejs.org/en) and [rust](https://www.rust-lang.org/tools/install) to be able to run and build the application. After you've downloaded everything you can clone the repo, and if you want you can modify the code, in any IDE you like; You can build it and run it entirely through the IDE terminal or an external one.

**In the terminal** you should run this (while being in the folder):
1. `pnpm install` 
2. Build/Run the app
  - `pnpm tauri dev`<br>_To run it in Developer mode_
  - `pnpm tauri build`<br>_To build it_<br>

After you've built it you should get an .msi and .exe installer in the target directory. From which you can download it :3



