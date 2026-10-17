# PopBoard

A classroom discussion app: students join a teacher's board to post comments and questions (optionally anonymously), upvote, answer polls, raise hands and signal confusion. Teachers run the board, polls, a seating map and per-student dashboards. A Study gallery holds self-contained science sandboxes.

- **Front end:** static files in `public/`, with no build step. Vercel deploys every push to `main`.
- **Back end:** Firebase project `hotseat-4f661`. **Firebase Auth** handles sign-in (teachers: email/password; students: anonymous, or a password-protected account). **Firestore** holds the data and **Storage** holds post images.
- **Security:** `firestore.rules` and `storage.rules` decide who can read and write what. Every write is tied to the signed-in user's Firebase Auth uid. The rules are published in the Firebase console (see below). Nothing in the page itself is trusted.

## Accounts

| Who | How they sign in | Notes |
|---|---|---|
| Teacher | Name **or** email + password (Create account / Sign In) | New teachers wait for an admin to approve them before they can create boards. Names are unique (ignoring case); `teacherNames/{lowercased name}` maps a name to the sign-in email. |
| Admin | A teacher account plus a doc at `admins/{uid}` | That doc can only be created in the Firebase console. Admins see every teacher and can approve or delete them. |
| Student, quick join | Name + board name, no password | Uses an anonymous Firebase sign-in that stays on that device. Nobody on another device can take the name while it's in use. |
| Student, protected | Name + board name + password (6+ characters) | Links that same account to a password login, so the student can sign in from any device. The teacher can **Reset Sign-in** from the student's dashboard if a student loses their device or password. |

## Data layout (Firestore)

```
admins/{uid}                         console-only admin marker
teachers/{uid}                       { name, email, approved }
teacherNames/{lowercased name}       { uid, email, name } for name sign-in (single-doc reads are public; listing is blocked)
teachers/{uid}/studyLinks/{id}       teacher's Study-gallery links
boards/{boardId}                     { name, ownerUid, teacherAccount, ...settings }
  students/{studentId}               { username, uid, secured, stats... }
  names/{username}                   { studentId, uid, secured, authSalt }   one per name
  members/{uid}                      { studentId, username }                 who-is-who for the rules
  posts/{id}, replies/{id}           signed: author + authorUid; anonymous: no author
  postAuthors/{id}                   hidden author of anonymous posts/replies (teacher-only)
  polls/{id} (+ drawings/{id}), leaderboard/{username}, seats/{id}
```

## Publishing the security rules (works on an iPad)

1. Firebase console → **Firestore Database** → **Rules**. Replace everything with the contents of `firestore.rules`, then tap **Publish**.
2. Firebase console → **Storage** → **Rules**. Replace everything with `storage.rules`, then tap **Publish**.

## Testing locally (optional, needs a computer)

```
cd tests
npm install
npm test           # security-rules tests on the Firestore + Storage emulators
npm run test:e2e   # signs in through the real pages against the emulators (needs Google Chrome)
```
Both use the local Firebase emulators, so no Firebase login is needed. `http://localhost:8765/?emulators=1` makes the app talk to the emulators. That switch only works on localhost.
