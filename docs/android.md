# Android app: real calls, messages and lights

The Android app is a thin native shell around the yazd server. The voice UI is the same web app. A small native plugin, `YazdDevice`, does the three things a browser cannot:

| Request                     | What happens on the phone                                           |
| --------------------------- | ------------------------------------------------------------------- |
| "Call mom"                  | WhatsApp voice call starts                                          |
| "Call mom on the phone"     | Regular phone call starts                                           |
| "Message mom that I'm late" | WhatsApp opens the chat with the text filled in. The user taps send |

Lights go straight from the server to Govee, so they work from the browser too.

Without `CONTACTS_FILE` and the `GOVEE_` variables, everything stays on stubs, as before.

## How it fits together

```
phone app (WebView) ──voice──▶ yazd server ──▶ orchestrator ──▶ call_contact
        ▲                                                         │
        └──── device_action event {whatsapp_call, +1617...} ◀──────┘
        │
   YazdDevice plugin ──▶ WhatsApp call intent
```

The server resolves the contact name to a phone number from `contacts.local.json` and sends a `device_action` event. In the Android app, the web bridge hands it to the plugin. In a browser, nothing happens: the activity panel just shows it.

## What you need

- Android Studio (it installs the Android SDK, `adb` and a JDK)
- An Android phone with WhatsApp, USB debugging on, and a USB cable
- A test contact who knows they will get calls, saved in the phone's contacts with WhatsApp

## 1. Get the code

```bash
git fetch origin && git checkout android-actions && git pull && npm install
```

## 2. Real contacts

```bash
cp contacts.example.json contacts.local.json
```

Edit `contacts.local.json` with real names and numbers in international format (`+1617...`). Names and aliases can be in any script. `contacts.local.json` is gitignored.

Add to `.env`:

```
CONTACTS_FILE=contacts.local.json
```

The `GOVEE_API_KEY`, `GOVEE_SKU` and `GOVEE_DEVICE` lines you already added turn on the real lamp. The lamp must be on Wi-Fi, not Bluetooth only.

## 3. Dry run in the browser

```bash
npm run dev
```

Say "call mom". The activity panel shows `Phone: whatsapp_call to ...`. That proves the server side works before any phone is involved. "Turn on the light" should switch the real lamp.

## 4. Run the server for the phone

Stop `npm run dev`, then:

```bash
npm run build && npm start
```

The server now serves the app and the API on port 8787.

## 5. Connect the phone

Phone: Settings > About phone > tap Build number 7 times. Then Settings > Developer options > USB debugging on. Plug it in and accept the prompt on the phone.

```bash
~/Library/Android/sdk/platform-tools/adb devices
~/Library/Android/sdk/platform-tools/adb reverse tcp:8787 tcp:8787
```

`adb reverse` makes `localhost:8787` on the phone reach your Mac. The API key never leaves the Mac. Run it again after every replug.

## 6. Build and install

```bash
cd apps/mobile && npx cap sync android && npx cap open android
```

Android Studio opens. Wait for Gradle to finish (the first time takes a few minutes). Pick your phone in the device menu at the top and press Run.

On first launch, allow the microphone, phone calls and contacts.

## 7. Test, in this order

1. "Call mom on the phone" in Farsi: **"Ba telefon be maman zang bezan"**. A regular call starts.
2. "Call mom": **"Be maman zang bezan"**. A WhatsApp voice call starts.
3. "Message mom that I'm late": **"Be maman payam bede ke dir miam"**. WhatsApp opens with the text.
4. "Turn on the light": **"Cheragh ro roshan kon"**.

## Without a cable

Use an HTTPS tunnel instead of `adb reverse`:

```bash
cloudflared tunnel --url http://localhost:8787
```

Then rebuild the app with that URL:

```bash
cd apps/mobile && YAZD_SERVER_URL=https://your-tunnel.trycloudflare.com npx cap sync android
```

and press Run again. Anyone with the tunnel URL can use your OpenRouter key while it runs, so stop it when you are done.

## Troubleshooting

| Symptom                                    | Fix                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shows "could not reach its server"     | Server not running, or run `adb reverse` again                                                                                                           |
| WhatsApp opens the chat instead of calling | The number is not saved in the phone's contacts with WhatsApp, or the number format differs. Save the contact, open WhatsApp once so it syncs, try again |
| Nothing happens on "call mom"              | Check `.env` has `CONTACTS_FILE`, and the contact has a phone number. The activity panel should show `Phone: whatsapp_call`                              |
| Phone call asks for permission every time  | Allow "Phone" for yazd in Android settings                                                                                                               |
| Microphone does nothing                    | Allow "Microphone" for yazd in Android settings                                                                                                          |
| Lamp fails                                 | Lamp must be on Wi-Fi. Test with the curl command in `govee-at-home.md`                                                                                  |
