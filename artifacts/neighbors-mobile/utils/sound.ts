import { Audio } from "expo-av";

let sendSound: Audio.Sound | null = null;
let receiveSound: Audio.Sound | null = null;

const SOUND_URIS = {
  send: "https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav", // message sent click
  receive: "https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav", // message received chime
};

export async function playMobileSound(type: "send" | "receive") {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
    });

    if (type === "send") {
      if (!sendSound) {
        const { sound } = await Audio.Sound.createAsync({ uri: SOUND_URIS.send });
        sendSound = sound;
      } else {
        await sendSound.setPositionAsync(0);
      }
      await sendSound.playAsync();
    } else if (type === "receive") {
      if (!receiveSound) {
        const { sound } = await Audio.Sound.createAsync({ uri: SOUND_URIS.receive });
        receiveSound = sound;
      } else {
        await receiveSound.setPositionAsync(0);
      }
      await receiveSound.playAsync();
    }
  } catch (err) {
    console.warn("Failed to play mobile sound:", err);
  }
}
