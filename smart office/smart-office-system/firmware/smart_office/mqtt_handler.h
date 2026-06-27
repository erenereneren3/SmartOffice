#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "actuators.h"

class MQTTHandler {
public:
    explicit MQTTHandler(ActuatorManager& actuators);
    void begin();
    void loop();
    void publishSensorData(float temp, float humidity, bool motion, int light, int co2);
    void publishActuatorStatus();
    void publishHeartbeat(int rssi, unsigned long uptimeSec, const String& ip);
    bool isConnected();

private:
    WiFiClient      _wifiClient;
    PubSubClient    _client;
    ActuatorManager& _actuators;
    unsigned long   _lastReconnectAttempt;
    unsigned long   _reconnectDelay;

    void _connect();
    void _subscribeAll();
    void _onMessage(char* topic, byte* payload, unsigned int length);
    void _handleLight(const JsonDocument& doc);
    void _handleBlinds(const JsonDocument& doc);
    void _handleHVAC(const JsonDocument& doc);
    void _handleSocket(const JsonDocument& doc);
    void _handleRGB(const JsonDocument& doc);

    static MQTTHandler*  _instance;
    static void          _staticCallback(char* topic, byte* payload, unsigned int length);
};
