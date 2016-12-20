/**
 * Created by nilsbergmann on 19.12.16.
 */
const Accessory = require('../').Accessory;
const Service = require('../').Service;
const Characteristic = require('../').Characteristic;
const uuid = require('../').uuid;
const config = require('../config.json');
const ping = require('ping');
const wol = require('wol');
const Sync = require('sync');
const async = require('async');
const request = require('request');
const jwt = require('jsonwebtoken');

let accessorys = [];

Sync(function () {
    async.each.sync(null, config.accessorys, (current, callback) => {
        const PCStatusUUID = uuid.generate(current.mac);
        const PCStatus = new Accessory(`${current.name} Status`, PCStatusUUID);
        PCStatus.username = current.mac;
        PCStatus.pincode = current.password;
        let CurrentStatus = false;
        setInterval(() => {
            ping.sys.probe(current.ip, (currentst) => {
                if (CurrentStatus != currentst) {
                    PCStatus.getService(Service.Switch).updateCharacteristic(Characteristic.On, currentst);
                }
                CurrentStatus = currentst;
            });
        }, 1500);
        PCStatus.addService(Service.Switch)
            .getCharacteristic(Characteristic.On)
            .on('set', (value, callback) => {
                if (current.allowShutdown && CurrentStatus == true) {
                    console.log(`Try to shutdown ${current.name}`);
                    sendCommand(current.ip, 'shutdown', current.secret, callback);
                } else if (current.WakeUPonLAN && CurrentStatus == false) {
                    wol.wake(current.mac, function (err, res) {
                        if (err) {
                            console.error(err);
                            callback(err)
                        } else {
                            console.log(res);
                            callback();
                        }
                    });
                } else {
                    callback();
                    setTimeout(function () {
                        PCStatus.getService(Service.Switch).updateCharacteristic(Characteristic.On, CurrentStatus);
                    }, 500);
                }
            })
            .on('get', (callback) => {
                callback(null, CurrentStatus);
            });

        accessorys.push(PCStatus);
        callback();
    });
});

module.exports = accessorys;

function sendCommand(ip, command, secret, callback) {
    const token = jwt.sign({command: command}, secret);
    request(`http://${ip}:9898?token=${token}`, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            callback();
        } else {
            callback(error);
        }
    });
}