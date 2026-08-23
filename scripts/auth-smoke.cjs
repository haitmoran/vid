const assert = require("node:assert/strict");
const path = require("node:path");

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

global.window = {
  localStorage: createStorage(),
  sessionStorage: createStorage(),
  crypto: globalThis.crypto,
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
  atob: (value) => Buffer.from(value, "base64").toString("binary"),
};

const auth = require(path.join(__dirname, "..", ".auth-test", "localAuth.js"));

async function run() {
  await assert.rejects(
    auth.registerAccount({ username: "moran", password: "manager-password" }),
    /manager account already exists/i,
  );

  const registered = await auth.registerAccount({
    username: "Moran_01",
    password: "initial-password",
    email: "moran@example.com",
  });
  assert.equal(registered.username, "Moran_01");
  assert.equal(registered.hasRecoveryEmail, true);
  await assert.rejects(
    auth.registerAccount({ username: "moran_01", password: "another-password" }),
    /already registered/,
  );

  auth.signOut();
  assert.equal(auth.getSession(), null);
  await assert.rejects(auth.signInAccount("moran_01", "wrong-password"), /Incorrect/);

  const signedIn = await auth.signInAccount("moran_01", "initial-password");
  assert.equal(signedIn.normalizedUsername, "moran_01");

  const liked = new Set(["video-001", "video-008"]);
  auth.saveLikedVideoIds(signedIn.normalizedUsername, liked);
  assert.deepEqual([...auth.getLikedVideoIds(signedIn.normalizedUsername)], [...liked]);

  const lovedStars = new Set(["aria-sol", "zuri-adebayo"]);
  auth.saveLovedStarSlugs(signedIn.normalizedUsername, lovedStars);
  assert.deepEqual(
    [...auth.getLovedStarSlugs(signedIn.normalizedUsername)],
    [...lovedStars],
  );

  await auth.changePassword({
    normalizedUsername: signedIn.normalizedUsername,
    currentPassword: "initial-password",
    newPassword: "changed-password",
  });
  await auth.signInAccount("Moran_01", "changed-password");

  await assert.rejects(
    auth.resetPassword({
      username: "Moran_01",
      email: "wrong@example.com",
      newPassword: "recovered-password",
    }),
    /do not match/,
  );

  await auth.resetPassword({
    username: "Moran_01",
    email: "moran@example.com",
    newPassword: "recovered-password",
  });
  await auth.signInAccount("Moran_01", "recovered-password");

  const manager = await auth.establishManagerSession("moran", "manager-password");
  assert.equal(manager.normalizedUsername, auth.MANAGER_USERNAME);
  assert.equal(auth.getSession()?.normalizedUsername, "moran");
  await assert.rejects(
    auth.changePassword({
      normalizedUsername: "moran",
      currentPassword: "manager-password",
      newPassword: "new-manager-password",
    }),
    /secure analytics sign-in/i,
  );

  await assertStorageFailuresAreSurvivable();

  process.stdout.write("Authentication smoke test passed.\n");
}

// Reading account storage must never throw: an unreadable or corrupt value
// used to propagate out of getSession() during mount and blank the whole site.
async function assertStorageFailuresAreSurvivable() {
  const originalLocal = global.window.localStorage;
  const originalSession = global.window.sessionStorage;

  const withStorage = (localStorage, sessionStorage) => {
    global.window.localStorage = localStorage;
    global.window.sessionStorage = sessionStorage;
  };

  try {
    // Corrupt JSON blob left behind by an older or interrupted write.
    const corrupt = createStorage();
    corrupt.setItem("kinet-users-v1", "{not json");
    const activeSession = createStorage();
    activeSession.setItem("kinet-session-v1", "moran");
    withStorage(corrupt, activeSession);
    assert.equal(auth.getSession(), null, "corrupt account JSON must sign the visitor out, not throw");

    // Right shape, wrong type.
    const wrongType = createStorage();
    wrongType.setItem("kinet-users-v1", '{"oops":true}');
    withStorage(wrongType, activeSession);
    assert.equal(auth.getSession(), null, "non-array account storage must not throw");

    // Storage present but blocked (private browsing, disabled site data).
    const blocked = {
      getItem() { throw new Error("The operation is insecure."); },
      setItem() { throw new Error("The operation is insecure."); },
      removeItem() { throw new Error("The operation is insecure."); },
    };
    withStorage(blocked, blocked);
    assert.equal(auth.getSession(), null, "blocked storage must not throw");
    assert.deepEqual([...auth.getLikedVideoIds("moran")], []);
    assert.deepEqual([...auth.getLovedStarSlugs("moran")], []);
    auth.signOut();

    // A full quota must not break the like and love buttons.
    const full = createStorage();
    full.setItem = () => { throw new Error("Quota exceeded."); };
    withStorage(full, createStorage());
    auth.saveLikedVideoIds("moran", new Set(["video-001"]));
    auth.saveLovedStarSlugs("moran", new Set(["aria-sol"]));
  } finally {
    withStorage(originalLocal, originalSession);
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
