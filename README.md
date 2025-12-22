<div align="center">
	
# <img src="public/images/rose.svg" width="20px" hight="20px"> RosePad 


![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads-pre/TMG8047KG/RosePad/latest/total?style=flat-square&label=Download%40Latest&color=green)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/TMG8047KG/RosePad/main.yml?style=flat-square)
![AUR Version](https://img.shields.io/aur/version/rosepad?label=AUR&style=flat-square)
![GitHub Tag](https://img.shields.io/github/v/tag/TMG8047KG/RosePad?style=flat-square&label=Tag)
![GitHub Repo stars](https://img.shields.io/github/stars/TMG8047KG/RosePad?style=flat-square&color=gold)
<br>
A simple cross-platform text editor made for writing notes, letters, poems, and such with ease, with a beautiful UI.<br>
Developed using Tauri v2 in combination with Vite, React, and Typescript.

<a href="https://apps.microsoft.com/detail/9NLLN9DJM147?mode=direct">
	<img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200"/>
</a>
</div>

###

> [!CAUTION]
> This is still in development, and everything you see can change at any point in time. As the app is an early Beta version.

---
### Idea and Reason
The idea behind this project is to combine the simplicity and style of Notepad and the text formatting functionality of Microsoft Word while being able to handle all or most of the text file extensions in one app.

The reason for making this came when I got pissed at how I couldn't style text I was writing in my trusty Notepad, which led me to switch to Word. Which is not a great experience since it's slow and, with a pretty cluttered UI, and on top of that, it sometimes has unexplainable behaviors, and requires a paid license. That doesn't help when you're trying to download it because Word may be the hardest downloadable thing.

---

### Supported Platforms
All supported platforms and the app's working status on those platforms.
> [!NOTE]
> There is a chance you might need to download or do something extra on some distros of Linux distributions to be able to run the editor properly.<br>
> Linux support is mainly tested on Arch Linux!

> [!TIP]
> When you're downloading RosePad on your macOS device, you might need to allow the app from the security settings due to the app not being certified by Apple.

| **Platform** 	 	|	**Supported** 	|  **Tested** 	|
|:-------------:	|:-------------:	|:----------:	|
|    Windows    	|       ✅       	|      ✅     	|
|     Linux     	|       ✅       	| 	   ✅	 	|
|     MacOS     	|       ✅       	|      ✅     	|
|    Android    	|       ❌       	|      ❌     	|
|      IOS      	|       ❌       	|      ❌     	|

---

### How to build the app from the source
If you want to build the app yourself from the source code or to make modifications and build the app with them, you will need to:
1. Clone or download the repository on your computer. That can be done by clicking "code" and selecting/copying the option you prefer. (Using git is recommended)
2. Then, if you don't have [Node.js](https://nodejs.org/en) and [Rust](https://www.rust-lang.org/tools/install), you will need to download them. You will also need to install [`pnpm`](https://pnpm.io/installation), which is used for the project.
3. After you've downloaded everything, you need to set up the project in an IDE or terminal of your choice. In which you have to execute this command:
   - ```pnpm install```
5. When everything is done, you just need to build it, or if you want to make changes and test them, you can run it in development mode with these commands:
   - For building the app: ```pnpm tauri build```
   - For development mode: ```pnpm tauri dev```

> [!NOTE]
> The build will create a system-specific installer.<br>
> *Example:
> On Windows, it will build WiX and NSIS installers.<br>*
> For more information, check the Tauri [documentation](https://v2.tauri.app/).

### Contributions
Everyone is free to contribute to and modify the app's code as they see fit, provided they follow the Contribution and License rules and clauses.

### Credits
Testers: [Sof](https://github.com/louis0s) and [Pl46u3](https://github.com/Pl46u32023)


