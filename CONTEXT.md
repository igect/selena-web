# Selena Media Archive — Domain Model

Core concepts and glossary for the Selena Media Archive platform.

## Terms

### Guest
An unauthenticated visitor browsing the archive. Guests can view pins, explore aesthetics, and preview public creator collections, but cannot edit profiles, access admin tooling, or persist bookmarks to the database.

### Member
An authenticated registered user with an active Supabase session. Members have a customizable profile (display name, handle, avatar), personal boards, saved bookmarks, and access to security settings (email, password, 2FA).

### Admin
A privileged role granted exclusively to users verified against the server-side `admin_users` database table. Admins can access the Admin CMS, publish pins, delete pins, and curate creators. Non-admins and guests have zero access or UI visibility to admin controls.

### Pin
An individual aesthetic media item in the archive consisting of an image or video, title, description, tags, creator attribution, destination link, and engagement metrics (saves, likes, comments).

### Board
A thematic collection created by a user to organize and group saved pins (e.g., editorial, vintage, moodboard).

### Creator
The original artist, photographer, or source credited with authoring the media associated with a pin.

### Account Settings
A private management interface where authenticated Members can update profile details (name, handle, avatar) and manage security credentials (email, password, TOTP two-factor authentication).

### Share Dialog
A multi-action sharing surface allowing users to copy the canonical pin page URL, copy the direct raw image/media asset URL, trigger the native OS Web Share sheet, and download high-resolution media.

### Auth Provider
An external identity service (e.g., Google OAuth) or internal mechanism (Email/Password) used to authenticate users into the application.
