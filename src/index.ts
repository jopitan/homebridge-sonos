const sonos = require('sonos');

let Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-sonos", "Sonos", SonosAccessory);
};

class SonosAccessory {

    private name;
    private room;
    private mute;
    private nonPlayableDevices;

    private service;
    private device;

    constructor(private log, private config) {
        this.name = this.config["name"];
        this.room = this.config["room"];
        this.mute = this.config["mute"];
        this.nonPlayableDevices = this.config["nonPlayableDevices"].split(";");

        if (!this.room) throw new Error("You must provide a config value for 'room'.");

        this.service = new Service.Switch(this.name);

        this.createCharacteristics();
    }

    private createCharacteristics() {
        this.service
            .getCharacteristic(Characteristic.On)
            .on('get', this.getOn.bind(this))
            .on('set', this.setOn.bind(this));

        this.service
            .addCharacteristic(Characteristic.Volume)
            .on('get', this.getVolume.bind(this))
            .on('set', this.setVolume.bind(this));

        this.search();
    }

    public zoneTypeIsPlayable(zoneType) {
        return !this.nonPlayableDevices.includes(zoneType);
    }

    public search() {
        const search = sonos.search((device) => {
            const host = device.host;
            this.log.debug("Found sonos device at %s", host);

            device.deviceDescription((err, description) => {

                const {zoneType, roomName} = description;
                if (!this.zoneTypeIsPlayable(zoneType)) {
                    this.log.debug("Sonos device %s is not playable (has an unknown zone type of %s); ignoring", host, zoneType);
                    return;
                }

                if (roomName !== this.room) {
                    this.log.debug("Ignoring device %s because the room name '%s' does not match the desired name '%s'.", host, roomName, this.room);
                    return;
                }

                if (null == this.device) { // avoin multiple call of search.destroy in multi-device rooms
                    this.log("Found a playable device at %s for room '%s'", host, roomName);
                    this.device = device;
                    search.destroy(); // we don't need to continue searching.
                }
            });
        });
    }

    public getServices() {
        return [this.service];
    }

    public getOn(callback) {
        if (!this.device) {
            this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
            callback(new Error("Sonos has not been discovered yet."));
            return;
        }

        this.device[!this.mute ? "getCurrentState" : "getMuted"]((err, state) => {
            if (err) {
                callback(err);
            } else {
                this.log.warn("Current state for Sonos: " + state);
                const on = (state === (!this.mute ? "playing" : false));
                callback(null, on);
            }
        });
    }

    public setOn(on, callback) {
        if (!this.device) {
            this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
            callback(new Error("Sonos has not been discovered yet."));
            return;
        }

        this.log("Setting power to %s", on);

        if (!this.mute) {
            this.device[on ? "play" : "pause"]((err, success) => {
                this.log("%s attempt with success: %s", on ? "Playback" : "Pause", success);
                callback(err || null);
            });
        } else {
            this.device.setMuted(!on, (err, success) => {
                this.log("%s attempt with success: %s", on ? "Unmute" : "Mute", success);
                callback(err || null);
            });
        }
    }

    public getVolume(callback) {
        if (!this.device) {
            this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
            callback(new Error("Sonos has not been discovered yet."));
            return;
        }

        this.device.getVolume((err, volume) => {
            if (err) {
                callback(err);
            } else {
                this.log("Current volume: %s", volume);
                callback(null, Number(volume));
            }

        });
    }

    public setVolume(volume, callback) {
        if (!this.device) {
            this.log.warn("Ignoring request; Sonos device has not yet been discovered.");
            callback(new Error("Sonos has not been discovered yet."));
            return;
        }

        this.log("Setting volume to %s", volume);

        this.device.setVolume(volume + "", (err, data) => {
            this.log("Set volume response with data: " + data);
            callback(err || null);
        });
    }

}
