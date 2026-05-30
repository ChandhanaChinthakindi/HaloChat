# HaloChat — Privacy Policy

**Effective Date:** 30 May 2026
**Last Updated:** 30 May 2026

---

## 1. Introduction

Welcome to HaloChat ("the App," "we," "our," or "us"). HaloChat is developed and operated by **Chandhana Chinthakindi** ("Developer").

This Privacy Policy explains what personal information we collect when you use HaloChat, how we use it, who we share it with, and what rights you have over your data. By creating an account or using the App, you agree to the collection and use of information as described in this policy.

If you do not agree to this Privacy Policy, please do not use the App.

---

## 2. Information We Collect

### 2.1 Information You Provide Directly

| Data | When Collected |
|---|---|
| **Email address** | During account registration |
| **Username** | During account registration |
| **Display name** | During onboarding |
| **Date of birth** | During registration (used for age-appropriate content settings) |
| **Password** | During registration (stored as a bcrypt hash — your plain-text password is never stored) |
| **Companion name and personality settings** | When you create or customise a companion |
| **Custom personality instructions** | When you write additional instructions for a companion |
| **Text messages** | The content of your conversations with AI companions |
| **Voice recordings** | Audio recorded during voice calls and voice messages (processed for transcription then discarded — see Section 3) |

### 2.2 Information Collected Automatically

| Data | Purpose |
|---|---|
| **Device push token** | To send you companion check-in notifications |
| **Session tokens (JWT)** | To keep you logged in securely |
| **Usage counters** | Daily message count per companion for rate limiting |
| **App interaction timestamps** | Last message time, to determine when a companion should send a check-in |

### 2.3 Information We Derive

- **Memory notes** — After conversations, we use an AI model (OpenAI GPT-4o-mini) to extract meaningful personal facts you have shared (e.g., your goals, preferences, life events) and store these as notes that are injected into future conversations to create continuity.
- **Mood history** — Your responses to optional mood check-ins (a 1–5 emoji scale) are stored per companion per day.
- **Relationship bond score** — A numerical score (0–100) derived from your conversation activity, representing the depth of your relationship with each companion.

### 2.4 Information We Do NOT Collect

- We do not collect your real name unless you choose to share it in a conversation.
- We do not collect your location.
- We do not collect biometric data.
- We do not access your contacts, photos, calendar, or other device content.
- We do not collect financial information (no payment processing is currently active in the App).

---

## 3. How We Use Your Information

| Purpose | Legal Basis |
|---|---|
| Create and manage your account | Contract performance |
| Operate the AI chat and voice call features | Contract performance |
| Personalise your companion's responses using your memory notes | Contract performance / Legitimate interest |
| Send push notifications for companion check-ins | Consent (you may disable notifications at any time in device Settings) |
| Age-appropriate content filtering (using your date of birth) | Legal obligation / User safety |
| Enforce daily usage limits and prevent abuse | Legitimate interest |
| Send password reset emails | Contract performance |
| Improve App stability and diagnose technical issues | Legitimate interest |

**We do not use your conversations or personal data to train any AI model.** Your messages are sent to OpenAI's API for real-time inference only — they are not retained by us for model training purposes.

---

## 4. Voice Recordings and Transcriptions

When you make a voice call or send a voice message:

1. **Your audio is recorded** on-device using your microphone.
2. **The audio file is transmitted** over HTTPS to our API server.
3. **The audio is sent to OpenAI's Whisper API** for transcription into text.
4. **The audio file is immediately discarded** after transcription. We do not store audio files.
5. **The transcribed text** is treated the same as a regular text message and stored in your conversation history.

By using voice features, you consent to this processing pipeline.

---

## 5. Third-Party Services

HaloChat uses the following third-party services to operate. Each service has its own privacy policy.

| Service | Purpose | Privacy Policy |
|---|---|---|
| **OpenAI** | AI chat responses (GPT-4o-mini), voice transcription (Whisper-1), text-to-speech (TTS-1) | https://openai.com/policies/privacy-policy |
| **Railway** | Database hosting (PostgreSQL) and API server infrastructure | https://railway.app/legal/privacy |
| **Resend** | Transactional email delivery (password reset, welcome emails) | https://resend.com/privacy |
| **Expo / Expo Notifications** | Push notification delivery infrastructure | https://expo.dev/privacy |
| **Apple Sign-In** | OAuth authentication (if used) | https://www.apple.com/legal/privacy |
| **Google OAuth** | OAuth authentication (if used) | https://policies.google.com/privacy |

**Important note on OpenAI:** Your conversation content is transmitted to OpenAI's API. OpenAI's data usage policies apply to this data. As of this writing, OpenAI does not use API-submitted data to train its models by default. We recommend reviewing OpenAI's privacy policy for the most current information.

---

## 6. Data Storage and Security

- All data is stored in a **PostgreSQL database** hosted on Railway's infrastructure.
- Communications between the App and our API server are protected by **HTTPS/TLS encryption**.
- Passwords are stored as **bcrypt hashes** — we cannot access your plain-text password.
- Authentication tokens are stored using **Expo SecureStore**, which uses the device's encrypted keychain (iOS Keychain).
- We implement rate limiting and daily usage limits to protect against unauthorised access and abuse.

While we implement reasonable technical measures, no system is 100% secure. We cannot guarantee the absolute security of your data.

---

## 7. Data Retention

| Data Type | Retention Period |
|---|---|
| Account information | Until you delete your account |
| Conversation messages | Until you clear your chat history or delete your account |
| Memory notes | Until you delete them manually or delete your account |
| Mood logs | Until you delete your account |
| Daily usage counters | Reset automatically each day; logs may be retained up to 30 days |
| Voice recordings | Immediately discarded after transcription (not retained) |
| Push notification tokens | Until you delete your account or revoke notification permission |

When you delete your account, all associated personal data is permanently deleted from our systems within **30 days**, except where retention is required by law.

---

## 8. Your Rights

Depending on your location, you may have the following rights:

- **Access** — Request a copy of the personal data we hold about you.
- **Correction** — Request correction of inaccurate data.
- **Deletion** — Request deletion of your account and personal data ("right to be forgotten").
- **Portability** — Request your conversation data in a structured format (where technically feasible).
- **Objection** — Object to processing based on legitimate interests.
- **Withdrawal of consent** — Withdraw consent for push notifications at any time via your device's notification settings.

To exercise any of these rights, contact us at the email address in Section 12.

**GDPR (EU/EEA users):** You have the additional right to lodge a complaint with your local data protection supervisory authority.

**CCPA (California residents):** We do not sell your personal information. You have the right to know what data we collect and request its deletion.

---

## 9. Children's Privacy

HaloChat is **not intended for users under the age of 13**. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately and we will delete the information.

Users aged 13–17 are subject to stricter AI content settings within the App. Users are required to provide their date of birth at registration; the App enforces age-appropriate behaviour based on this information.

---

## 10. International Data Transfers

HaloChat is developed and operated from Australia. Your data may be stored and processed in data centres located in the United States (Railway, OpenAI) and other countries. By using the App, you consent to the transfer of your information to countries that may have different data protection laws than your country of residence.

Where required by applicable law, we ensure appropriate safeguards are in place for international data transfers.

---

## 11. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. When we do, we will:
- Update the "Last Updated" date at the top of this document.
- Notify you via an in-app notification or email (for material changes).

Your continued use of the App after changes are posted constitutes your acceptance of the updated policy.

---

## 12. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact:

**Chandhana Chinthakindi**
**Email:** cchinthakindi98@gmail.com

We will respond to all requests within **30 days**.

---

*This Privacy Policy was prepared for HaloChat v1.1. It is not legal advice. If you are unsure whether your data practices are compliant with applicable laws in your jurisdiction, please consult a qualified legal professional.*
