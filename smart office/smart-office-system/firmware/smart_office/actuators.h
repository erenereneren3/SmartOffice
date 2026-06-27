#pragma once

#include <Arduino.h>

enum class BlindState { IDLE, UP, DOWN };

struct ActuatorState {
    bool       light;
    BlindState blinds;
    bool       hvac;
    bool       socket;
    uint8_t    rgbR;
    uint8_t    rgbG;
    uint8_t    rgbB;
};

class ActuatorManager {
public:
    ActuatorManager();
    void          begin();
    void          setLight(bool on);
    void          setBlinds(const String& direction);
    void          setHVAC(bool on);
    void          setSocket(bool on);
    void          setRGB(uint8_t r, uint8_t g, uint8_t b);
    ActuatorState getState() const;

private:
    ActuatorState _state;
    void          _stopBlinds();
};
