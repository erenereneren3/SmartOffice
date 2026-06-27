#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include "config.h"
#include "sensors.h"
#include "actuators.h"
#include "mqtt_handler.h"

SensorManager  sensors;
ActuatorManager actuators;
MQTTHandler    mqttHandler(actuators);

unsigned long lastSensorPublish = 0;
unsigned long lastHeartbeat     = 0;

void setupWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.setHostname("smart-office-esp32");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
    }
}

void setupOTA() {
    ArduinoOTA.setHostname("smart-office-esp32");
    ArduinoOTA.onStart([]() {
        actuators.setRGB(128, 64, 0);
    });
    ArduinoOTA.onEnd([]() {
        actuators.setRGB(0, 128, 0);
        delay(500);
        actuators.setRGB(0, 0, 0);
    });
    ArduinoOTA.onError([](ota_error_t) {
        actuators.setRGB(128, 0, 0);
    });
    ArduinoOTA.begin();
}

void setup() {
    Serial.begin(115200);
    sensors.begin();
    actuators.begin();
    actuators.setRGB(0, 0, 64);
    setupWiFi();
    setupOTA();
    mqttHandler.begin();
    actuators.setRGB(0, 64, 0);
    delay(300);
    actuators.setRGB(0, 0, 0);
}

void loop() {
    ArduinoOTA.handle();
    mqttHandler.loop();

    unsigned long now = millis();

    if (now - lastSensorPublish >= SENSOR_PUBLISH_INTERVAL) {
        lastSensorPublish = now;
        if (mqttHandler.isConnected()) {
            SensorData d = sensors.read();
            if (d.valid) {
                mqttHandler.publishSensorData(
                    d.temperature,
                    d.humidity,
                    d.motion,
                    d.lightLevel,
                    d.co2Level
                );
            }
        }
    }

    if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
        lastHeartbeat = now;
        if (mqttHandler.isConnected()) {
            mqttHandler.publishHeartbeat(
                WiFi.RSSI(),
                now / 1000,
                WiFi.localIP().toString()
            );
        }
    }
}
