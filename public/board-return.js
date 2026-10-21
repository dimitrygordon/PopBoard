// Pure helpers for returning from the Study library to the PopBoard the
// user had open. No DOM and no Firebase: app.js and study.html supply
// storage, auth, and navigation.
//
// The board id is not in the URL of index.html today, and it is not in
// localStorage. It only exists in memory, so a fresh load of / always
// shows the sign-in form. Opening Study records the return target in the
// Study URL (a new tab does not share sessionStorage) and in
// sessionStorage (so a reload of the same tab can restore it).

export var BOARD_RETURN_STORAGE_KEY = "popboard.boardReturn";

var ROLES = { teacher: true, student: true, display: true, portal: true };
var RETURN_QUERY_KEYS = ["board", "student", "name", "pbreturn"];
var FORWARD_QUERY_KEYS = ["board", "student", "name", "teacher", "pbreturn", "emulators"];

export function normalizeId(value) {
  if (typeof value !== "string") return "";
  var id = value.trim();
  if (!id || id.length > 128) return "";
  if (id === "." || id === "..") return "";
  if (/[\u0000-\u001f\u007f\s/\\?#&=]/.test(id)) return "";
  return id;
}

export function normalizeName(value) {
  if (typeof value !== "string") return "";
  var name = value.trim();
  if (!name || name.length > 60) return "";
  if (name.indexOf("/") !== -1) return "";
  if (name === "." || name === "..") return "";
  if (/^__.*__$/.test(name)) return "";
  return name;
}

// { role, boardId, studentId, name } -> a storage/URL state, or null.
// portal has no board. student requires a student id. A bad name is
// dropped rather than rejecting the whole return.
export function buildReturnState(input) {
  var src = input || {};
  if (src.v != null && src.v !== 1) return null;
  var role = typeof src.role === "string" ? src.role : "";
  if (!ROLES[role]) return null;
  if (role === "portal") return { v: 1, role: "portal" };
  var boardId = normalizeId(src.boardId);
  if (!boardId) return null;
  if (role === "student") {
    var studentId = normalizeId(src.studentId);
    if (!studentId) return null;
    var state = { v: 1, role: "student", boardId: boardId, studentId: studentId };
    var name = normalizeName(src.name);
    if (name) state.name = name;
    return state;
  }
  return { v: 1, role: role, boardId: boardId };
}

export function serializeReturnState(state) {
  var clean = buildReturnState(state);
  return clean ? JSON.stringify(clean) : "";
}

export function parseStoredReturn(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return buildReturnState(data);
  } catch (e) {
    return null;
  }
}

function toParams(search) {
  if (search && typeof search.get === "function" && typeof search.has === "function") {
    return search;
  }
  var raw = String(search == null ? "" : search);
  if (raw.charAt(0) === "?") raw = raw.slice(1);
  var hash = raw.indexOf("#");
  if (hash !== -1) raw = raw.slice(0, hash);
  return new URLSearchParams(raw);
}

function roleFromParams(params) {
  var role = params.get("pbreturn") || "";
  if (role === "teacher" || role === "student" || role === "display" || role === "portal") return role;
  return "";
}

// Read a return target out of a page URL. Module deep-link params
// (mode, view, T, ...) are ignored. A board id wins over pbreturn=portal.
// Student links that predate pbreturn are inferred from ?student=.
export function returnStateFromSearch(search) {
  var params = toParams(search);
  var role = roleFromParams(params);
  var boardId = params.get("board");
  if (boardId) {
    if (!role || role === "portal") role = params.get("student") ? "student" : "teacher";
    return buildReturnState({
      role: role,
      boardId: boardId,
      studentId: params.get("student") || "",
      name: params.get("name") || ""
    });
  }
  if (role === "portal") return buildReturnState({ role: "portal" });
  return null;
}

// URL wins when it carries a board or pbreturn. An explicit but unusable
// value does not fall through to storage. Storage is the reload path,
// used when the URL has no return target (including ?emulators=1 alone).
export function chooseReturnTarget(search, storedRaw) {
  var params = toParams(search);
  var explicit = params.has("board") || params.has("pbreturn");
  var fromUrl = returnStateFromSearch(params);
  if (fromUrl) return { state: fromUrl, source: "url" };
  if (explicit) return null;
  var fromStore = parseStoredReturn(storedRaw);
  if (fromStore) return { state: fromStore, source: "storage" };
  return null;
}

export function boardAppHref(state, opts) {
  var emulators = !!(opts && opts.emulators);
  var params = new URLSearchParams();
  if (state && state.role === "portal") {
    params.set("pbreturn", "portal");
  } else if (state && state.boardId && state.role && state.role !== "portal") {
    params.set("board", state.boardId);
    params.set("pbreturn", state.role);
    if (state.role === "student" && state.studentId) {
      params.set("student", state.studentId);
      if (state.name) params.set("name", state.name);
    }
  }
  if (emulators) params.set("emulators", "1");
  var q = params.toString();
  return q ? "./?" + q : "./";
}

export function studyLibraryBackHref(search) {
  var params = toParams(search);
  return boardAppHref(returnStateFromSearch(params), { emulators: params.has("emulators") });
}

// Href for the Study button on the board or the teacher portal.
// input: { role, boardId, studentId, name, teacherUid, emulators }
export function studyOpenHref(input) {
  var src = input || {};
  var params = new URLSearchParams();
  if (src.teacherUid) params.set("teacher", String(src.teacherUid));
  var role = src.role || "";
  if (role === "student" || role === "teacher" || role === "display") {
    var state = buildReturnState({
      role: role,
      boardId: src.boardId,
      studentId: src.studentId,
      name: src.name
    });
    if (state && state.boardId) {
      params.set("board", state.boardId);
      params.set("pbreturn", state.role);
      if (state.role === "student") {
        params.set("student", state.studentId);
        if (state.name) params.set("name", state.name);
      }
    }
  } else if (role === "portal") {
    params.set("pbreturn", "portal");
  }
  if (src.emulators) params.set("emulators", "1");
  var q = params.toString();
  return "study.html" + (q ? "?" + q : "");
}

export function forwardStudyQuery(search) {
  var src = toParams(search);
  var out = new URLSearchParams();
  for (var i = 0; i < FORWARD_QUERY_KEYS.length; i++) {
    var key = FORWARD_QUERY_KEYS[i];
    var value = src.get(key);
    if (value) out.set(key, value);
  }
  return out;
}

// Open a built-in module with the gallery's return params only.
// Module deep links (mode, view, T, n, ...) stay on that module and are
// not copied onto the next one.
export function moduleOpenHref(file, search) {
  var base = String(file || "");
  var q = forwardStudyQuery(search).toString();
  if (!q) return base;
  return base + (base.indexOf("?") === -1 ? "?" : "&") + q;
}

// Drop the return target from index.html's URL after a successful restore
// so a reload uses sessionStorage. Keep emulators and unrelated deep-link
// params (sky, wx, mode, ...).
export function searchWithoutReturn(search) {
  var params = new URLSearchParams(toParams(search).toString());
  for (var i = 0; i < RETURN_QUERY_KEYS.length; i++) params.delete(RETURN_QUERY_KEYS[i]);
  var q = params.toString();
  return q ? "?" + q : "";
}
