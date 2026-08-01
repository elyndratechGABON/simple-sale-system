import { r as __exportAll } from "../../_runtime.mjs";
import { i as registerPlugin, n as WebPlugin, r as buildRequestInit } from "../capacitor__core+unenv.mjs";
//#region node_modules/@capacitor/synapse/dist/synapse.mjs
function s(t) {
	t.CapacitorUtils.Synapse = new Proxy({}, { get(e, n) {
		return new Proxy({}, { get(w, o) {
			return (c, p, r) => {
				const i = t.Capacitor.Plugins[n];
				if (i === void 0) {
					r(/* @__PURE__ */ new Error(`Capacitor plugin ${n} not found`));
					return;
				}
				if (typeof i[o] != "function") {
					r(/* @__PURE__ */ new Error(`Method ${o} not found in Capacitor plugin ${n}`));
					return;
				}
				(async () => {
					try {
						p(await i[o](c));
					} catch (a) {
						r(a);
					}
				})();
			};
		} });
	} });
}
function u(t) {
	t.CapacitorUtils.Synapse = new Proxy({}, { get(e, n) {
		return t.cordova.plugins[n];
	} });
}
function f(t = !1) {
	typeof window > "u" || (window.CapacitorUtils = window.CapacitorUtils || {}, window.Capacitor !== void 0 && !t ? s(window) : window.cordova !== void 0 && u(window));
}
//#endregion
//#region node_modules/@capacitor/filesystem/dist/esm/definitions.js
var Directory;
(function(Directory) {
	/**
	* The Documents directory.
	* On iOS it's the app's documents directory.
	* Use this directory to store user-generated content.
	* On Android it's the Public Documents folder, so it's accessible from other apps.
	* It's not accessible on Android 10 unless the app enables legacy External Storage
	* by adding `android:requestLegacyExternalStorage="true"` in the `application` tag
	* in the `AndroidManifest.xml`.
	* On Android 11 or newer the app can only access the files/folders the app created.
	*
	* @since 1.0.0
	*/
	Directory["Documents"] = "DOCUMENTS";
	/**
	* The Data directory.
	* On iOS it will use the Documents directory.
	* On Android it's the directory holding application files.
	* Files will be deleted when the application is uninstalled.
	*
	* @since 1.0.0
	*/
	Directory["Data"] = "DATA";
	/**
	* The Library directory.
	* On iOS it will use the Library directory.
	* On Android it's the directory holding application files.
	* Files will be deleted when the application is uninstalled.
	*
	* @since 1.1.0
	*/
	Directory["Library"] = "LIBRARY";
	/**
	* The Cache directory.
	* Can be deleted in cases of low memory, so use this directory to write app-specific files.
	* that your app can re-create easily.
	*
	* @since 1.0.0
	*/
	Directory["Cache"] = "CACHE";
	/**
	* The external directory.
	* On iOS it will use the Documents directory.
	* On Android it's the directory on the primary shared/external
	* storage device where the application can place persistent files it owns.
	* These files are internal to the applications, and not typically visible
	* to the user as media.
	* Files will be deleted when the application is uninstalled.
	*
	* @since 1.0.0
	*/
	Directory["External"] = "EXTERNAL";
	/**
	* The external storage directory.
	* On iOS it will use the Documents directory.
	* On Android it's the primary shared/external storage directory.
	* It's not accessible on Android 10 unless the app enables legacy External Storage
	* by adding `android:requestLegacyExternalStorage="true"` in the `application` tag
	* in the `AndroidManifest.xml`.
	* It's not accessible on Android 11 or newer.
	*
	* @since 1.0.0
	*/
	Directory["ExternalStorage"] = "EXTERNAL_STORAGE";
	/**
	* The external cache directory.
	* On iOS it will use the Documents directory.
	* On Android it's the primary shared/external cache.
	*
	* @since 7.1.0
	*/
	Directory["ExternalCache"] = "EXTERNAL_CACHE";
	/**
	* The Library directory without cloud backup. Used in iOS.
	* On Android it's the directory holding application files.
	*
	* @since 7.1.0
	*/
	Directory["LibraryNoCloud"] = "LIBRARY_NO_CLOUD";
	/**
	* A temporary directory for iOS.
	* On Android it's the directory holding the application cache.
	*
	* @since 7.1.0
	*/
	Directory["Temporary"] = "TEMPORARY";
})(Directory || (Directory = {}));
var Encoding;
(function(Encoding) {
	/**
	* Eight-bit UCS Transformation Format
	*
	* @since 1.0.0
	*/
	Encoding["UTF8"] = "utf8";
	/**
	* Seven-bit ASCII, a.k.a. ISO646-US, a.k.a. the Basic Latin block of the
	* Unicode character set
	* This encoding is only supported on Android.
	*
	* @since 1.0.0
	*/
	Encoding["ASCII"] = "ascii";
	/**
	* Sixteen-bit UCS Transformation Format, byte order identified by an
	* optional byte-order mark
	* This encoding is only supported on Android.
	*
	* @since 1.0.0
	*/
	Encoding["UTF16"] = "utf16";
})(Encoding || (Encoding = {}));
//#endregion
//#region node_modules/@capacitor/filesystem/dist/esm/index.js
var esm_exports = /* @__PURE__ */ __exportAll({
	Directory: () => Directory,
	Encoding: () => Encoding,
	Filesystem: () => Filesystem
});
var Filesystem = registerPlugin("Filesystem", { web: () => Promise.resolve().then(() => web_exports).then((m) => new m.FilesystemWeb()) });
f();
//#endregion
//#region node_modules/@capacitor/filesystem/dist/esm/web.js
var web_exports = /* @__PURE__ */ __exportAll({ FilesystemWeb: () => FilesystemWeb });
function resolve(path) {
	const posix = path.split("/").filter((item) => item !== ".");
	const newPosix = [];
	posix.forEach((item) => {
		if (item === ".." && newPosix.length > 0 && newPosix[newPosix.length - 1] !== "..") newPosix.pop();
		else newPosix.push(item);
	});
	return newPosix.join("/");
}
function isPathParent(parent, children) {
	parent = resolve(parent);
	children = resolve(children);
	const pathsA = parent.split("/");
	const pathsB = children.split("/");
	return parent !== children && pathsA.every((value, index) => value === pathsB[index]);
}
var FilesystemWeb = class FilesystemWeb extends WebPlugin {
	constructor() {
		super(...arguments);
		this.DB_VERSION = 1;
		this.DB_NAME = "Disc";
		this._writeCmds = [
			"add",
			"put",
			"delete"
		];
		/**
		* Function that performs a http request to a server and downloads the file to the specified destination
		*
		* @deprecated Use the @capacitor/file-transfer plugin instead.
		* @param options the options for the download operation
		* @returns a promise that resolves with the download file result
		*/
		this.downloadFile = async (options) => {
			var _a, _b;
			const requestInit = buildRequestInit(options, options.webFetchExtra);
			const response = await fetch(options.url, requestInit);
			let blob;
			if (!options.progress) blob = await response.blob();
			else if (!(response === null || response === void 0 ? void 0 : response.body)) blob = new Blob();
			else {
				const reader = response.body.getReader();
				let bytes = 0;
				const chunks = [];
				const contentType = response.headers.get("content-type");
				const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					chunks.push(value);
					bytes += (value === null || value === void 0 ? void 0 : value.length) || 0;
					const status = {
						url: options.url,
						bytes,
						contentLength
					};
					this.notifyListeners("progress", status);
				}
				const allChunks = new Uint8Array(bytes);
				let position = 0;
				for (const chunk of chunks) {
					if (typeof chunk === "undefined") continue;
					allChunks.set(chunk, position);
					position += chunk.length;
				}
				blob = new Blob([allChunks.buffer], { type: contentType || void 0 });
			}
			return {
				path: (await this.writeFile({
					path: options.path,
					directory: (_a = options.directory) !== null && _a !== void 0 ? _a : void 0,
					recursive: (_b = options.recursive) !== null && _b !== void 0 ? _b : false,
					data: blob
				})).uri,
				blob
			};
		};
	}
	readFileInChunks(_options, _callback) {
		throw this.unavailable("Method not implemented.");
	}
	async initDb() {
		if (this._db !== void 0) return this._db;
		if (!("indexedDB" in window)) throw this.unavailable("This browser doesn't support IndexedDB");
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
			request.onupgradeneeded = FilesystemWeb.doUpgrade;
			request.onsuccess = () => {
				this._db = request.result;
				resolve(request.result);
			};
			request.onerror = () => reject(request.error);
			request.onblocked = () => {
				console.warn("db blocked");
			};
		});
	}
	static doUpgrade(event) {
		const db = event.target.result;
		switch (event.oldVersion) {
			default:
				if (db.objectStoreNames.contains("FileStorage")) db.deleteObjectStore("FileStorage");
				db.createObjectStore("FileStorage", { keyPath: "path" }).createIndex("by_folder", "folder");
		}
	}
	async dbRequest(cmd, args) {
		const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
		return this.initDb().then((conn) => {
			return new Promise((resolve, reject) => {
				const req = conn.transaction(["FileStorage"], readFlag).objectStore("FileStorage")[cmd](...args);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
		});
	}
	async dbIndexRequest(indexName, cmd, args) {
		const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
		return this.initDb().then((conn) => {
			return new Promise((resolve, reject) => {
				const req = conn.transaction(["FileStorage"], readFlag).objectStore("FileStorage").index(indexName)[cmd](...args);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
		});
	}
	getPath(directory, uriPath) {
		const cleanedUriPath = uriPath !== void 0 ? uriPath.replace(/^[/]+|[/]+$/g, "") : "";
		let fsPath = "";
		if (directory !== void 0) fsPath += "/" + directory;
		if (uriPath !== "") fsPath += "/" + cleanedUriPath;
		return fsPath;
	}
	async clear() {
		(await this.initDb()).transaction(["FileStorage"], "readwrite").objectStore("FileStorage").clear();
	}
	/**
	* Read a file from disk
	* @param options options for the file read
	* @return a promise that resolves with the read file data result
	*/
	async readFile(options) {
		const path = this.getPath(options.directory, options.path);
		const entry = await this.dbRequest("get", [path]);
		if (entry === void 0) throw Error("File does not exist.");
		return { data: entry.content ? entry.content : "" };
	}
	/**
	* Write a file to disk in the specified location on device
	* @param options options for the file write
	* @return a promise that resolves with the file write result
	*/
	async writeFile(options) {
		const path = this.getPath(options.directory, options.path);
		let data = options.data;
		const encoding = options.encoding;
		const doRecursive = options.recursive;
		const occupiedEntry = await this.dbRequest("get", [path]);
		if (occupiedEntry && occupiedEntry.type === "directory") throw Error("The supplied path is a directory.");
		const parentPath = path.substr(0, path.lastIndexOf("/"));
		if (await this.dbRequest("get", [parentPath]) === void 0) {
			const subDirIndex = parentPath.indexOf("/", 1);
			if (subDirIndex !== -1) {
				const parentArgPath = parentPath.substr(subDirIndex);
				await this.mkdir({
					path: parentArgPath,
					directory: options.directory,
					recursive: doRecursive
				});
			}
		}
		if (!encoding && !(data instanceof Blob)) {
			data = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
			if (!this.isBase64String(data)) throw Error("The supplied data is not valid base64 content.");
		}
		const now = Date.now();
		const pathObj = {
			path,
			folder: parentPath,
			type: "file",
			size: data instanceof Blob ? data.size : data.length,
			ctime: now,
			mtime: now,
			content: data
		};
		await this.dbRequest("put", [pathObj]);
		return { uri: pathObj.path };
	}
	/**
	* Append to a file on disk in the specified location on device
	* @param options options for the file append
	* @return a promise that resolves with the file write result
	*/
	async appendFile(options) {
		const path = this.getPath(options.directory, options.path);
		let data = options.data;
		const encoding = options.encoding;
		const parentPath = path.substr(0, path.lastIndexOf("/"));
		const now = Date.now();
		let ctime = now;
		const occupiedEntry = await this.dbRequest("get", [path]);
		if (occupiedEntry && occupiedEntry.type === "directory") throw Error("The supplied path is a directory.");
		if (await this.dbRequest("get", [parentPath]) === void 0) {
			const subDirIndex = parentPath.indexOf("/", 1);
			if (subDirIndex !== -1) {
				const parentArgPath = parentPath.substr(subDirIndex);
				await this.mkdir({
					path: parentArgPath,
					directory: options.directory,
					recursive: true
				});
			}
		}
		if (!encoding && !this.isBase64String(data)) throw Error("The supplied data is not valid base64 content.");
		if (occupiedEntry !== void 0) {
			if (occupiedEntry.content instanceof Blob) throw Error("The occupied entry contains a Blob object which cannot be appended to.");
			if (occupiedEntry.content !== void 0 && !encoding) data = btoa(atob(occupiedEntry.content) + atob(data));
			else data = occupiedEntry.content + data;
			ctime = occupiedEntry.ctime;
		}
		const pathObj = {
			path,
			folder: parentPath,
			type: "file",
			size: data.length,
			ctime,
			mtime: now,
			content: data
		};
		await this.dbRequest("put", [pathObj]);
	}
	/**
	* Delete a file from disk
	* @param options options for the file delete
	* @return a promise that resolves with the deleted file data result
	*/
	async deleteFile(options) {
		const path = this.getPath(options.directory, options.path);
		if (await this.dbRequest("get", [path]) === void 0) throw Error("File does not exist.");
		if ((await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)])).length !== 0) throw Error("Folder is not empty.");
		await this.dbRequest("delete", [path]);
	}
	/**
	* Create a directory.
	* @param options options for the mkdir
	* @return a promise that resolves with the mkdir result
	*/
	async mkdir(options) {
		const path = this.getPath(options.directory, options.path);
		const doRecursive = options.recursive;
		const parentPath = path.substr(0, path.lastIndexOf("/"));
		const depth = (path.match(/\//g) || []).length;
		const parentEntry = await this.dbRequest("get", [parentPath]);
		const occupiedEntry = await this.dbRequest("get", [path]);
		if (depth === 1) throw Error("Cannot create Root directory");
		if (occupiedEntry !== void 0) throw Error("Current directory does already exist.");
		if (!doRecursive && depth !== 2 && parentEntry === void 0) throw Error("Parent directory must exist");
		if (doRecursive && depth !== 2 && parentEntry === void 0) {
			const parentArgPath = parentPath.substr(parentPath.indexOf("/", 1));
			await this.mkdir({
				path: parentArgPath,
				directory: options.directory,
				recursive: doRecursive
			});
		}
		const now = Date.now();
		const pathObj = {
			path,
			folder: parentPath,
			type: "directory",
			size: 0,
			ctime: now,
			mtime: now
		};
		await this.dbRequest("put", [pathObj]);
	}
	/**
	* Remove a directory
	* @param options the options for the directory remove
	*/
	async rmdir(options) {
		const { path, directory, recursive } = options;
		const fullPath = this.getPath(directory, path);
		const entry = await this.dbRequest("get", [fullPath]);
		if (entry === void 0) throw Error("Folder does not exist.");
		if (entry.type !== "directory") throw Error("Requested path is not a directory");
		const readDirResult = await this.readdir({
			path,
			directory
		});
		if (readDirResult.files.length !== 0 && !recursive) throw Error("Folder is not empty");
		for (const entry of readDirResult.files) {
			const entryPath = `${path}/${entry.name}`;
			if ((await this.stat({
				path: entryPath,
				directory
			})).type === "file") await this.deleteFile({
				path: entryPath,
				directory
			});
			else await this.rmdir({
				path: entryPath,
				directory,
				recursive
			});
		}
		await this.dbRequest("delete", [fullPath]);
	}
	/**
	* Return a list of files from the directory (not recursive)
	* @param options the options for the readdir operation
	* @return a promise that resolves with the readdir directory listing result
	*/
	async readdir(options) {
		const path = this.getPath(options.directory, options.path);
		const entry = await this.dbRequest("get", [path]);
		if (options.path !== "" && entry === void 0) throw Error("Folder does not exist.");
		const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
		return { files: await Promise.all(entries.map(async (e) => {
			let subEntry = await this.dbRequest("get", [e]);
			if (subEntry === void 0) subEntry = await this.dbRequest("get", [e + "/"]);
			return {
				name: e.substring(path.length + 1),
				type: subEntry.type,
				size: subEntry.size,
				ctime: subEntry.ctime,
				mtime: subEntry.mtime,
				uri: subEntry.path
			};
		})) };
	}
	/**
	* Return full File URI for a path and directory
	* @param options the options for the stat operation
	* @return a promise that resolves with the file stat result
	*/
	async getUri(options) {
		const path = this.getPath(options.directory, options.path);
		let entry = await this.dbRequest("get", [path]);
		if (entry === void 0) entry = await this.dbRequest("get", [path + "/"]);
		return { uri: (entry === null || entry === void 0 ? void 0 : entry.path) || path };
	}
	/**
	* Return data about a file
	* @param options the options for the stat operation
	* @return a promise that resolves with the file stat result
	*/
	async stat(options) {
		const path = this.getPath(options.directory, options.path);
		let entry = await this.dbRequest("get", [path]);
		if (entry === void 0) entry = await this.dbRequest("get", [path + "/"]);
		if (entry === void 0) throw Error("Entry does not exist.");
		return {
			name: entry.path.substring(path.length + 1),
			type: entry.type,
			size: entry.size,
			ctime: entry.ctime,
			mtime: entry.mtime,
			uri: entry.path
		};
	}
	/**
	* Rename a file or directory
	* @param options the options for the rename operation
	* @return a promise that resolves with the rename result
	*/
	async rename(options) {
		await this._copy(options, true);
	}
	/**
	* Copy a file or directory
	* @param options the options for the copy operation
	* @return a promise that resolves with the copy result
	*/
	async copy(options) {
		return this._copy(options, false);
	}
	async requestPermissions() {
		return { publicStorage: "granted" };
	}
	async checkPermissions() {
		return { publicStorage: "granted" };
	}
	/**
	* Function that can perform a copy or a rename
	* @param options the options for the rename operation
	* @param doRename whether to perform a rename or copy operation
	* @return a promise that resolves with the result
	*/
	async _copy(options, doRename = false) {
		let { toDirectory } = options;
		const { to, from, directory: fromDirectory } = options;
		if (!to || !from) throw Error("Both to and from must be provided");
		if (!toDirectory) toDirectory = fromDirectory;
		const fromPath = this.getPath(fromDirectory, from);
		const toPath = this.getPath(toDirectory, to);
		if (fromPath === toPath) return { uri: toPath };
		if (isPathParent(fromPath, toPath)) throw Error("To path cannot contain the from path");
		let toObj;
		try {
			toObj = await this.stat({
				path: to,
				directory: toDirectory
			});
		} catch (e) {
			const toPathComponents = to.split("/");
			toPathComponents.pop();
			const toPath = toPathComponents.join("/");
			if (toPathComponents.length > 0) {
				if ((await this.stat({
					path: toPath,
					directory: toDirectory
				})).type !== "directory") throw new Error("Parent directory of the to path is a file");
			}
		}
		if (toObj && toObj.type === "directory") throw new Error("Cannot overwrite a directory with a file");
		const fromObj = await this.stat({
			path: from,
			directory: fromDirectory
		});
		const updateTime = async (path, ctime, mtime) => {
			const fullPath = this.getPath(toDirectory, path);
			const entry = await this.dbRequest("get", [fullPath]);
			entry.ctime = ctime;
			entry.mtime = mtime;
			await this.dbRequest("put", [entry]);
		};
		const ctime = fromObj.ctime ? fromObj.ctime : Date.now();
		switch (fromObj.type) {
			case "file": {
				const file = await this.readFile({
					path: from,
					directory: fromDirectory
				});
				if (doRename) await this.deleteFile({
					path: from,
					directory: fromDirectory
				});
				let encoding;
				if (!(file.data instanceof Blob) && !this.isBase64String(file.data)) encoding = Encoding.UTF8;
				const writeResult = await this.writeFile({
					path: to,
					directory: toDirectory,
					data: file.data,
					encoding
				});
				if (doRename) await updateTime(to, ctime, fromObj.mtime);
				return writeResult;
			}
			case "directory": {
				if (toObj) throw Error("Cannot move a directory over an existing object");
				try {
					await this.mkdir({
						path: to,
						directory: toDirectory,
						recursive: false
					});
					if (doRename) await updateTime(to, ctime, fromObj.mtime);
				} catch (e) {}
				const contents = (await this.readdir({
					path: from,
					directory: fromDirectory
				})).files;
				for (const filename of contents) await this._copy({
					from: `${from}/${filename.name}`,
					to: `${to}/${filename.name}`,
					directory: fromDirectory,
					toDirectory
				}, doRename);
				if (doRename) await this.rmdir({
					path: from,
					directory: fromDirectory
				});
			}
		}
		return { uri: toPath };
	}
	isBase64String(str) {
		try {
			return btoa(atob(str)) == str;
		} catch (err) {
			return false;
		}
	}
};
FilesystemWeb._debug = true;
//#endregion
export { esm_exports as t };
