/* Snag host script — imports a downloaded file into the open project. */

function snagImport(filePath, binName) {
  try {
    var f = new File(filePath);
    if (!f.exists) return "ERR: file not found: " + filePath;

    var host = BridgeTalk.appName;

    if (host === "aftereffects") {
      return snagImportAE(f, binName);
    }
    if (host === "premierepro") {
      return snagImportPPro(f, binName);
    }
    return "ERR: unsupported host " + host;
  } catch (e) {
    return "ERR: " + e.toString();
  }
}

function snagImportAE(f, binName) {
  if (!app.project) return "ERR: no project open";

  var io = new ImportOptions(f);
  if (io.canImportAs(ImportAsType.FOOTAGE)) io.importAs = ImportAsType.FOOTAGE;

  app.beginUndoGroup("Snag import");
  try {
    var item = app.project.importFile(io);
    var folder = null;
    for (var i = 1; i <= app.project.numItems; i++) {
      var it = app.project.item(i);
      if (it instanceof FolderItem && it.name === binName) { folder = it; break; }
    }
    if (!folder) folder = app.project.items.addFolder(binName);
    item.parentFolder = folder;
    item.selected = true;
  } finally {
    app.endUndoGroup();
  }
  return "OK";
}

function snagImportPPro(f, binName) {
  if (!app.project) return "ERR: no project open";

  var root = app.project.rootItem;
  var bin = null;
  for (var i = 0; i < root.children.numItems; i++) {
    var c = root.children[i];
    if (c.type === ProjectItemType.BIN && c.name === binName) { bin = c; break; }
  }
  if (!bin) bin = root.createBin(binName);

  var ok = app.project.importFiles([f.fsName], true, bin, false);
  return ok ? "OK" : "ERR: importFiles returned false";
}
