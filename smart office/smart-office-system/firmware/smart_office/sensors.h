#pragma once

#include <Arduino.h>
#include <DHT.h>
#include "config.h"

struct SensorData {
    float temperature;
    float humidity;
    bool  motion;
    int   lightLevel;
    int   co2Level;
    unsigned long timestamp;
    bool  valid;
};

class SensorManager {
public:
    SensorManager();
    void       begin();
    SensorData read();

private:
    DHT   _dht;
    float _readTemperature();
    float _readHumidity();
    bool  _readMotion();
    int   _readLight();
    int   _readCO2();
};
