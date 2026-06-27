#pragma once

#define WIFI_SSID        "YourWiFiSSID"
#define WIFI_PASSWORD    "YourWiFiPassword"

#define MQTT_BROKER      "192.168.1.100"
#define MQTT_PORT        1883
#define MQTT_CLIENT_ID   "smart-office-esp32"
#define MQTT_USER        ""
#define MQTT_PASS        ""

#define ROOM_ID          "room1"

#define PIN_DHT22        4
#define PIN_PIR          5
#define PIN_LDR          34
#define PIN_MQ135        35

#define PIN_RELAY_LIGHT  16
#define PIN_RELAY_BLINDS 17
#define PIN_RELAY_HVAC   18
#define PIN_RELAY_SOCKET 19

#define PIN_RGB_R        25
#define PIN_RGB_G        26
#define PIN_RGB_B        27

#define TOPIC_TEMP              "office/" ROOM_ID "/sensors/temperature"
#define TOPIC_HUMIDITY          "office/" ROOM_ID "/sensors/humidity"
#define TOPIC_MOTION            "office/" ROOM_ID "/sensors/motion"
#define TOPIC_LIGHT             "office/" ROOM_ID "/sensors/light"
#define TOPIC_CO2               "office/" ROOM_ID "/sensors/co2"

#define TOPIC_CMD_LIGHT         "office/" ROOM_ID "/actuators/light/cmd"
#define TOPIC_CMD_BLINDS        "office/" ROOM_ID "/actuators/blinds/cmd"
#define TOPIC_CMD_HVAC          "office/" ROOM_ID "/actuators/hvac/cmd"
#define TOPIC_CMD_SOCKET        "office/" ROOM_ID "/actuators/socket/cmd"
#define TOPIC_CMD_RGB           "office/" ROOM_ID "/actuators/rgb/cmd"

#define TOPIC_STATUS_LIGHT      "office/" ROOM_ID "/actuators/light/status"
#define TOPIC_STATUS_BLINDS     "office/" ROOM_ID "/actuators/blinds/status"
#define TOPIC_STATUS_HVAC       "office/" ROOM_ID "/actuators/hvac/status"
#define TOPIC_STATUS_SOCKET     "office/" ROOM_ID "/actuators/socket/status"

#define TOPIC_HEARTBEAT         "office/" ROOM_ID "/heartbeat"
#define TOPIC_OTA               "office/system/ota"

#define SENSOR_PUBLISH_INTERVAL 5000
#define HEARTBEAT_INTERVAL      30000
#define DHT_TYPE                DHT22
#define MQTT_BUFFER_SIZE        512
