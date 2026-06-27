#include "sensors.h"

SensorManager::SensorManager() : _dht(PIN_DHT22, DHT_TYPE) {}

void SensorManager::begin() {
    _dht.begin();
    pinMode(PIN_PIR,   INPUT);
    pinMode(PIN_LDR,   INPUT);
    pinMode(PIN_MQ135, INPUT);
}

SensorData SensorManager::read() {
    SensorData data;
    data.temperature = _readTemperature();
    data.humidity    = _readHumidity();
    data.motion      = _readMotion();
    data.lightLevel  = _readLight();
    data.co2Level    = _readCO2();
    data.timestamp   = millis();
    data.valid       = (data.temperature != -999.0f && data.humidity != -999.0f);
    return data;
}

float SensorManager::_readTemperature() {
    float t = _dht.readTemperature();
    return isnan(t) ? -999.0f : t;
}

float SensorManager::_readHumidity() {
    float h = _dht.readHumidity();
    return isnan(h) ? -999.0f : h;
}

bool SensorManager::_readMotion() {
    return digitalRead(PIN_PIR) == HIGH;
}

int SensorManager::_readLight() {
    int raw = analogRead(PIN_LDR);
    return map(raw, 0, 4095, 0, 1000);
}

int SensorManager::_readCO2() {
    int raw = analogRead(PIN_MQ135);
    return map(raw, 0, 4095, 400, 5000);
}
