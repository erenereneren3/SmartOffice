#include "mqtt_handler.h"
#include "config.h"

MQTTHandler* MQTTHandler::_instance = nullptr;

MQTTHandler::MQTTHandler(ActuatorManager& actuators)
    : _actuators(actuators),
      _client(_wifiClient),
      _lastReconnectAttempt(0),
      _reconnectDelay(1000) {
    _instance = this;
}

void MQTTHandler::begin() {
    _client.setServer(MQTT_BROKER, MQTT_PORT);
    _client.setCallback(_staticCallback);
    _client.setBufferSize(MQTT_BUFFER_SIZE);
    _connect();
}

void MQTTHandler::_connect() {
    if (_client.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS)) {
        _subscribeAll();
        _reconnectDelay = 1000;
    }
}

void MQTTHandler::_subscribeAll() {
    _client.subscribe(TOPIC_CMD_LIGHT);
    _client.subscribe(TOPIC_CMD_BLINDS);
    _client.subscribe(TOPIC_CMD_HVAC);
    _client.subscribe(TOPIC_CMD_SOCKET);
    _client.subscribe(TOPIC_CMD_RGB);
    _client.subscribe(TOPIC_OTA);
}

void MQTTHandler::loop() {
    if (!_client.connected()) {
        unsigned long now = millis();
        if (now - _lastReconnectAttempt > _reconnectDelay) {
            _lastReconnectAttempt = now;
            _connect();
            _reconnectDelay = min(_reconnectDelay * 2UL, 60000UL);
        }
    }
    _client.loop();
}

void MQTTHandler::publishSensorData(float temp, float humidity, bool motion, int light, int co2) {
    StaticJsonDocument<128> doc;
    char buf[128];
    unsigned long ts = millis();

    auto pub = [&](const char* topic, auto value, const char* unit) {
        doc.clear();
        doc["value"] = value;
        if (unit) doc["unit"] = unit;
        doc["ts"] = ts;
        serializeJson(doc, buf);
        _client.publish(topic, buf);
    };

    pub(TOPIC_TEMP,     temp,     "C");
    pub(TOPIC_HUMIDITY, humidity, "%");
    pub(TOPIC_MOTION,   motion,   nullptr);
    pub(TOPIC_LIGHT,    light,    "lux");
    pub(TOPIC_CO2,      co2,      "ppm");
}

void MQTTHandler::publishActuatorStatus() {
    ActuatorState s = _actuators.getState();
    StaticJsonDocument<128> doc;
    char buf[128];

    auto pubBool = [&](const char* topic, bool on) {
        doc.clear();
        doc["state"] = on ? "ON" : "OFF";
        serializeJson(doc, buf);
        _client.publish(topic, buf, true);
    };

    pubBool(TOPIC_STATUS_LIGHT,  s.light);
    pubBool(TOPIC_STATUS_HVAC,   s.hvac);
    pubBool(TOPIC_STATUS_SOCKET, s.socket);

    doc.clear();
    if (s.blinds == BlindState::UP)        doc["state"] = "UP";
    else if (s.blinds == BlindState::DOWN) doc["state"] = "DOWN";
    else                                   doc["state"] = "IDLE";
    serializeJson(doc, buf);
    _client.publish(TOPIC_STATUS_BLINDS, buf, true);
}

void MQTTHandler::publishHeartbeat(int rssi, unsigned long uptimeSec, const String& ip) {
    StaticJsonDocument<128> doc;
    doc["rssi"]   = rssi;
    doc["uptime"] = uptimeSec;
    doc["ip"]     = ip;
    char buf[128];
    serializeJson(doc, buf);
    _client.publish(TOPIC_HEARTBEAT, buf);
}

bool MQTTHandler::isConnected() {
    return _client.connected();
}

void MQTTHandler::_onMessage(char* topic, byte* payload, unsigned int length) {
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, payload, length)) return;

    String t = String(topic);
    if      (t == TOPIC_CMD_LIGHT)  _handleLight(doc);
    else if (t == TOPIC_CMD_BLINDS) _handleBlinds(doc);
    else if (t == TOPIC_CMD_HVAC)   _handleHVAC(doc);
    else if (t == TOPIC_CMD_SOCKET) _handleSocket(doc);
    else if (t == TOPIC_CMD_RGB)    _handleRGB(doc);

    publishActuatorStatus();
}

void MQTTHandler::_handleLight(const JsonDocument& doc) {
    _actuators.setLight(String(doc["state"].as<const char*>()) == "ON");
}

void MQTTHandler::_handleBlinds(const JsonDocument& doc) {
    _actuators.setBlinds(doc["state"].as<String>());
}

void MQTTHandler::_handleHVAC(const JsonDocument& doc) {
    _actuators.setHVAC(String(doc["state"].as<const char*>()) == "ON");
}

void MQTTHandler::_handleSocket(const JsonDocument& doc) {
    _actuators.setSocket(String(doc["state"].as<const char*>()) == "ON");
}

void MQTTHandler::_handleRGB(const JsonDocument& doc) {
    _actuators.setRGB(
        doc["r"] | 0,
        doc["g"] | 0,
        doc["b"] | 0
    );
}

void MQTTHandler::_staticCallback(char* topic, byte* payload, unsigned int length) {
    if (_instance) _instance->_onMessage(topic, payload, length);
}
