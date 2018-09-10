// Platform-specific functions
var Platform = {
	// Get the full paths of all files in a directory and subdirectories
	getLocalFiles: function (baseDir) {
		return new Promise(function (resolve, reject) {
			window.resolveLocalFileSystemURL(baseDir, function (directory) {
				let dReader = directory.createReader();
				let entries = [];

				let getEntries = function () {
					dReader.readEntries(function (results) {
						if (results.length) {
							entries = entries.concat(results);
							getEntries();
						} else {
							promiseChain(entries, function (resolve, reject, entry, allFiles) {
								if (entry.isDirectory) {
									getLocalFiles(entry.nativeURL).then(function (files) {
										resolve(allFiles.concat(files));
									});
								} else {
									resolve(allFiles.concat([entry.nativeURL]));
								}
							}, []).then(function (allFiles) {
								resolve(allFiles);
							});
						}
					});
				};

				getEntries();
			}, reject);
		});
	},

	// Delete a list of local files
	deleteFiles: function (files) {
		return promiseChain(files, function (resolve, reject, filePath) {
			window.resolveLocalFileSystemURL(filePath, function (entry) {
				if (entry.isDirectory) {
					getLocalFiles(entry.toURL()).then(function (allFiles) {
						return deleteFiles(allFiles);
					}).then(function () {
						entry.remove(resolve, reject);
					});
				} else entry.remove(resolve, reject);
			});
		});
	},

	// Perform a list of file movements (each in the form {from: path1, to: path2})
	moveFiles: function (movements) {
		return promiseChain(movements, function (resolve, reject, movement) {
			window.resolveLocalFileSystemURL(movement.from, function (fileEntry) {
				let dirURL = movement.to.split("/").reverse().slice(1).reverse().join("/");
				let newName = movement.to.split("/").reverse()[0];
				window.resolveLocalFileSystemURL(dirURL, function (dirEntry) {
					fileEntry.moveTo(dirEntry, newName, resolve, reject);
				});
			});
		});
	},

	// Download a list of files and save them locally
	downloadFiles: function (localDir, files) {
		return promiseChain(files, function (resolve, reject, file) {
			fileTransfer.download(serverUrl + "api/images/" + file.split("/").reverse()[0].split(".")[0] + "/", localDir + file, resolve, reject);
		});
		// TODO different sizes (as parameter to this)
	},

	notify (data) {
		cordova.plugins.notification.local.schedule({
			id: data.id,
			title: data.title,
			text: data.text,
			progressBar: (data.progress || data.progress === 0) ? { value: data.progress } : null
		});
	}
};