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

let accessorys = [];

Sync(function () {
    async.each.sync(null, config.accessorys, (current) => {
        const PCStatusUUID = uuid.generate(current.mac);
        const PCStatus = new Accessory(`${current.name} Status`, PCStatusUUID);
        PCStatus.username = current.mac;
        PCStatus.pincode = current.password;
        let CurrentStatus = false;
        setInterval(() => {
            ping.sys.probe(current.ip, (currentst) => {
                if (CurrentStatus != currentst){
                    PCStatus.getService(Service.Switch).updateCharacteristic(Characteristic.On, currentst);
                }
                CurrentStatus = currentst;
            });
        }, 1500);
        PCStatus.addService(Service.Switch)
            .getCharacteristic(Characteristic.On)
            .on('set', (value, callback) => {
                if (current.allow)
                callback();
                setTimeout(function () {
                    PCStatus.getService(Service.Switch).updateCharacteristic(Characteristic.On, CurrentStatus);
                }, 500);
            })
            .on('get', (callback) => {
                callback(null, CurrentStatus);
            });

        accessorys.push(PCStatus);
        callback();
    });
});

module.exports = accessorys;