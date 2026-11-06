# Jitsi WebRTC 155.0.1 contains an orphan generated Dav1dDecoderJni bridge,
# but omits Dav1dDecoder and its Natives interface. No other Java class uses
# that bridge (GEN_JNI only declares its native entry point). Aurea uses data
# channels, not AV1 video decoding. Suppress only this absent optional type.
-dontwarn org.webrtc.Dav1dDecoder$Natives
