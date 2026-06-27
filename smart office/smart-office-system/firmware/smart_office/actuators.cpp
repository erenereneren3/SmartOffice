#include "actuators.h"
#include "config.h"

ActuatorManager::ActuatorManager() {
    _state = { false, BlindState::IDLE, false, false, 0, 0, 0 };
}

void ActuatorManager::begin() {
    pinMode(PIN_RELAY_LIGHT,  OUTPUT);
    pinMode(PIN_RELAY_BLINDS, OUTPUT);
    pinMode(PIN_RELAY_HVAC,   OUTPUT);
    pinMode(PIN_RELAY_SOCKET, OUTPUT);

    ledcSetup(0, 5000, 8);
    ledcSetup(1, 5000, 8);
    ledcSetup(2, 5000, 8);
    ledcAttachPin(PIN_RGB_R, 0);
    ledcAttachPin(PIN_RGB_G, 1);
    ledcAttachPin(PIN_RGB_B, 2);

    digitalWrite(PIN_RELAY_LIGHT,  LOW);
    digitalWrite(PIN_RELAY_BLINDS, LOW);
    digitalWrite(PIN_RELAY_HVAC,   LOW);
    digitalWrite(PIN_RELAY_SOCKET, LOW);
    setRGB(0, 0, 0);
}

void ActuatorManager::setLight(bool on) {
    _state.light = on;
    digitalWrite(PIN_RELAY_LIGHT, on ? HIGH : LOW);
}

void ActuatorManager::setBlinds(const String& direction) {
    if (direction == "UP") {
        _state.blinds = BlindState::UP;
        digitalWrite(PIN_RELAY_BLINDS, HIGH);
    } else if (direction == "DOWN") {
        _state.blinds = BlindState::DOWN;
        digitalWrite(PIN_RELAY_BLINDS, LOW);
    } else {
        _stopBlinds();
    }
}

void ActuatorManager::_stopBlinds() {
    _state.blinds = BlindState::IDLE;
    digitalWrite(PIN_RELAY_BLINDS, LOW);
}

void ActuatorManager::setHVAC(bool on) {
    _state.hvac = on;
    digitalWrite(PIN_RELAY_HVAC, on ? HIGH : LOW);
}

void ActuatorManager::setSocket(bool on) {
    _state.socket = on;
    digitalWrite(PIN_RELAY_SOCKET, on ? HIGH : LOW);
}

void ActuatorManager::setRGB(uint8_t r, uint8_t g, uint8_t b) {
    _state.rgbR = r;
    _state.rgbG = g;
    _state.rgbB = b;
    ledcWrite(0, r);
    ledcWrite(1, g);
    ledcWrite(2, b);
}

ActuatorState ActuatorManager::getState() const {
    return _state;
}
