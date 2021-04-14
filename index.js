'use strict'
const JOB_WARRIOR = 0

// Warrior Skills
const DEADLY_GAMBLE_ABNORMALITY = [100801];
const DEADLY_GAMBLE_ABNORMALITY_END = [100811];
const A_RUSH_ABNORMALITY = [201904,201903];
const A_RUSH_ABNORMALITY_END = [201904,201903];

const path = require('path');
const fs = require('fs');
const s = require('./warriorSkills.js');
const { SKILL_BD, SKILL_AERIAL_SCYTHE, SKILL_SCYTHE, SKILL_BLOCK } = require('./warriorSkills.js');
const { cachedDataVersionTag } = require('v8');
const SettingsUI = require('tera-mod-ui').Settings;

module.exports = function warrior(mod) {
	const { command } = mod

	let config = getConfig()
	let settingTimeout = null
	let settingLock = false

	function jsonRequire(data) {
		delete require.cache[require.resolve(data)]
		return require(data)
	}

	function jsonSave(name, data) {
		fs.writeFile(path.join(__dirname, name), JSON.stringify(data, null, 4), err => {

		});
	}

	function getConfig() {
		let data = {}
		try {
			data = jsonRequire('./config.json')
		} catch (e) {
			data = {
				RFCANCEL_DELAY: 0,
				RF2CANCEL_DELAY: 420,
				CSCANCEL_DELAY: 550,
				PBCANCEL_DELAY: 550,
				VORTEXCANCEL_DELAY: 770,
				REAPINGCANCEL_DELAY: 840,
				CHAINREAPINGCANCEL_DELAY: 400,
				RAWSCYTHECANCEL_DELAY: 1000,
				CHAINSCYTHECANCEL_DELAY: 750,
				RAWROBCANCEL_DELAY: 1800,
				CHAINROBCANCEL_DELAY: 1480,
				RAWBDCANCEL_DELAY: 1680,
				CHAINBDCANCEL_DELAY: 790,
				CASCADECANCEL_DELAY: 640,
				TOBCANCEL_DELAY: 1260,
				SHOUTCANCEL_DELAY: 1440,
				ENRAGECANCEL_DELAY: 1860,
				LEAPINGCANCEL_DELAY: 2000,
				DELAY_INFO: "All the delays here are already at the lowest possible, set them higher for a slower cancel or set them to 0 to disable them",
				BLADE_WALTZ_AUTO_BD_DURING_DG: true,
				BLADE_WALTZ_AUTO_BD_DURING_DG_INFO: "If activated will not automatically block cancel bd during dg to avoid desynchronization",
				BLADE_WALTZ_AUTO_ROB_DURING_DG_IF_BD_ON_CD: false,
				AUTO_BD_AFTER_SCYTHE: true,
				AUTO_BD_AFTER_AERIAL_SCYTHE: true,
				AUTO_BD_AFTER_ROB: true,
				AUTO_BD_AFTER_CHS: true,
				AUTO_BD_AFTER_RF: true,
				AUTO_BD_AFTER_BD: true,
				AUTO_BD_AFTER_BLOCK: true,
				AUTO_BD_AFTER_TOB: true,
				AUTO_BD_AFTER_VORTEX: true,
				INSTANT_BLADE_FRENZY_CANCEL: true,
				INSTANT_AERIAL_CANCEL: true,
				INSTANT_SCYTHE_CANCEL: true,
				INSTANT_BACKSTAB_CANCEL: true,
				INSTANT_CHARGING_SLASH_CANCEL: true,
				INSTANT_REAPING_SLASH_CANCEL: true,
				INSTANT_AUTO_ATTACK1_CANCEL: true,
				INSTANT_INFO: "Activating will cancel the respectively skill EXTREMELY fast",
				AUTO_CANCEL_TC_IF_13_STACKS: true,
				TC_INFO: "Will auto block cancel traverse cut as soon as possible",
				BD_KEY: "R",
				ROB_KEY: "1",
				BLOCK_KEY: "X",
				KEYS_INFO: "Set bd/rob keys if you are using bd/rob macros and block key for INSTANT cancels"
			}
			jsonSave('config.json', data)
		}
		return data
	}

	let cancelTime = 25
	let job
	let enabled = false
	let aspd
	let atkid = []
	let atkid_base = 0xFEFEFFEE
	let disabSkill = []
	let unlockAll = false
	let timer = []
	let finishcheck = []
	let finish = []
	let cancelAdvanced = false
	let blockX
	let dstance = false
	let blade_waltz_crit_buff = false
	let tCLock
	let bDLock
	let roBLock
	let reapLock
	let scytheLock
	let rollLock
	let tOBLock
	let lastSkill
	let lastEvent
	let GLOBAL_LOCK_DELAY = 1000
	let blockActive = 0
	let instantBlockActive = 0
	let bdBlockActive = 0
	let tbBlockActive = 0
	let robBlockActive = 0
	let aesBlockActive = 0
	let scytheBlockActive = 0
	let sub = 0
	let dgActive = false
	let glyphState = []
	let failsafe = 0
	let bdOnCd = false
	let bwLock = true
	let dgTal = false
	let macroBdLock = false;
	let macroRobLock = false;
	let tcStacks = 0;
	let ui = null;
	let aesCounter = 0;

	let BD_KEY = "R";
	if (("BD_KEY" in config)) {
		BD_KEY = config.BD_KEY;
	}

	let ROB_KEY = "1";
	if (("ROB_KEY" in config)) {
		ROB_KEY = config.ROB_KEY;
	}

	let BLOCK_KEY = "X";
	if (("BLOCK_KEY" in config)) {
		BLOCK_KEY = config.BLOCK_KEY;
	}

	let talentState = []
	mod.hook('S_LOAD_EP_INFO', 2, (event) => {
		if (!enabled) { return }
		talentState = []
		event.perks.forEach(function (element) {
			talentState[element.id] = element.level
		})
	})

	mod.hook('S_LEARN_EP_PERK', 1, (event) => {
		if (!enabled) { return }
		talentState = []
		event.perks.forEach(function (element) {
			talentState[element.id] = element.level
		})
	})

	mod.hook('S_LOGIN', 14, (event) => {
		job = (mod.game.me.templateId - 10101) % 100
		enabled = [JOB_WARRIOR].includes(job)
		if (!enabled) { dstance = false }
	})

	mod.hook('S_RP_SKILL_POLISHING_LIST', 1, (event) => {
		if (!enabled) return;
		try {
			event.optionEffects.forEach(function (element) {
				if (element.id == 17012002) {
					dgTal = element.active;
				}
			});
		}
		catch (e) { }
	});

	mod.hook('S_DEFEND_SUCCESS', 3, (event) => {
		if (!enabled) { return; }

		if(dstance && lastSkill == s.SKILL_TOB) {
				disabSkill[SKILL_BD] = false;
				tbBlockActive = 1;
				if(config.AUTO_BD_AFTER_TOB) {
					var robot18 = require("robotjs");
					setTimeout(() => { // prevents bd from being cast too soon
						for(var i = 0; i < 10; i++) {
							robot18.keyTap(BD_KEY);
						}
					}, 1 / aspd);
				}
		}
		if(dstance && (lastSkill == s.SKILL_BD || lastSkill == s.SKILL_BD_2 || lastSkill == s.SKILL_BD_3 || lastSkill == s.SKILL_BD_4)) {
			disabSkill[SKILL_BD] = false;
			bdBlockActive = 1;
			if(config.AUTO_BD_AFTER_BD) {
				var robot18 = require("robotjs");
				setTimeout(() => { // prevents bd from being cast too soon
					for(var i = 0; i < 10; i++) {
						robot18.keyTap(BD_KEY);
					}
				}, 1 / aspd);
			}
		}
		if(dstance && (lastSkill == s.SKILL_AERIAL_SCYTHE || lastSkill == s.SKILL_AERIAL_SCYTHE_SECOND_CAST)) {
			disabSkill[SKILL_BD] = false;
			aesBlockActive = 1;
		}
		if(dstance && (lastSkill == s.SKILL_ROB || lastSkill == s.SKILL_ROB_2 || lastSkill == s.SKILL_ROB_3 || lastSkill == s.SKILL_ROB_4)) {
			disabSkill[SKILL_BD] = false;
			robBlockActive = 1;
			if(config.AUTO_BD_AFTER_ROB) {
				var robot18 = require("robotjs");
				setTimeout(() => { // prevents bd from being cast too soon
					for(var i = 0; i < 10; i++) {
						robot18.keyTap(BD_KEY);
					}
				}, 200 / aspd);
			}
		}
		if(dstance && (lastSkill == s.SKILL_SCYTHE || lastSkill == s.SKILL_SCYTHE_2 || lastSkill == s.SKILL_SCYTHE_3 || lastSkill == s.SKILL_SCYTHE_4)) {
			disabSkill[SKILL_BD] = false;
			scytheBlockActive = 1;
			if(config.AUTO_BD_AFTER_SCYTHE) {
				var robot18 = require("robotjs");
				setTimeout(() => { // prevents bd from being cast too soon
					for(var i = 0; i < 10; i++) {
						robot18.keyTap(BD_KEY);
					}
				}, 1 / aspd);
			}
		}
		if(dstance && lastSkill == s.SKILL_BLOCK) {
			disabSkill[SKILL_BD] = false;
			blockActive = 1;
			if(config.AUTO_BD_AFTER_BLOCK) {
				var robot18 = require("robotjs");
				setTimeout(() => { // prevents bd from being cast too soon
					for(var i = 0; i < 10; i++) {
						robot18.keyTap(BD_KEY);
					}
				}, 1 / aspd);
			}
		}
	});

	command.add('dwarr', {
		reload() {
			config = getConfig()
			command.message(`Config has been reloaded.`)
		},
		config() {
			if(ui) {
				ui.show();
			}
		},
		$default() { command.message(`Warrior autoblock: ${(enabled = !enabled) ? 'en' : 'dis'}abled.`) }
	})

	function skillCheck(event, duration) {
		sub = 0
		var speed = 1
		if (event.skill.id == s.SKILL_BD && (lastSkill == s.SKILL_BLADE_WALTZ || lastSkill == s.SKILL_BLADE_WALTZ_SECOND_CAST || lastSkill == s.SKILL_VORTEX || lastSkill == s.SKILL_VORTEX_EX || lastSkill == s.SKILL_VORTEX_EX_2  || lastSkill == s.SKILL_TC || lastSkill == s.SKILL_RISING_FURY_2)) {
			sub = 30
			duration = 1565
		}
		if (event.skill.id == s.SKILL_BLADE_FRENZY && (lastSkill == s.SKILL_SCYTHE || lastSkill == s.SKILL_ROLL || lastSkill == s.SKILL_AERIAL_SCYTHE_SECOND_CAST)) {
			sub = 30
			duration = s.SKILL_BLADE_FRENZY_DURATION_CHAIN
		}
		if ((event.skill.id == s.SKILL_BLADE_WALTZ || event.skill.id == s.SKILL_BLADE_WALTZ_SECOND_CAST) && blade_waltz_crit_buff) sub = 2
		if (event.skill.id == s.SKILL_BD && (lastSkill == s.SKILL_CHARGING_2 || (lastSkill == s.SKILL_TOB && tbBlockActive == 1))) {
			sub = 30
			duration = 1565
		}
		if (event.skill.id == s.SKILL_BD && (blockActive == 1 || bdBlockActive == 1)) { // block -> bd
			sub = 30
			duration = 1565
		}
		if(event.skill.id == s.SKILL_BD && aesBlockActive == 1 && (lastSkill == s.SKILL_AERIAL_SCYTHE || lastSkill == SKILL_AERIAL_SCYTHE.SKILL_AERIAL_SCYTHE_SECOND_CAST)) { // aes -> bd
			sub = 30
			duration = 1565
		}
		if(event.skill.id == s.SKILL_BD && scytheBlockActive == 1 && (lastSkill == s.SKILL_SCYTHE || lastSkill == s.SKILL_SCYTHE_2 || lastSkill == s.SKILL_SCYTHE_3 || lastSkill == s.SKILL_SCYTHE_4)) { // scythe -> bd
			sub = 30
			duration = 1565
		}
		if(event.skill.id == s.SKILL_BD && robBlockActive == 1 && (lastSkill == s.SKILL_ROB || lastSkill == s.SKILL_ROB_2 || lastSkill == s.SKILL_ROB_3 || lastSkill == s.SKILL_ROB_4)) {
			sub = 30 
			duration = 1565
		}
		if (event.skill.id == s.SKILL_ROB && (lastSkill == s.SKILL_BLADE_WALTZ || lastSkill == s.SKILL_BLADE_WALTZ_SECOND_CAST || lastSkill == s.SKILL_COMBATIVE_STRIKE || lastSkill == s.SKILL_COMBATIVE_STRIKE_2 || lastSkill == s.SKILL_CASCADE)) {
			sub = 30
			duration = 2370
		}
		if (event.skill.id == s.SKILL_SCYTHE && (lastSkill == s.SKILL_BLADE_WALTZ || lastSkill == s.SKILL_BLADE_WALTZ_SECOND_CAST || lastSkill == s.SKILL_PB || lastSkill == s.SKILL_ROB || lastSkill == s.SKILL_BD || lastSkill == s.SKILL_ROLL || lastSkill == s.SKILL_LEAPING)) {
			sub = 30
			duration = 1635
		}
		if (event.skill.id == s.SKILL_TC && (lastSkill == s.SKILL_LEAPING || lastSkill == s.SKILL_BLADE_WALTZ || lastSkill == s.SKILL_BLADE_WALTZ_SECOND_CAST || lastSkill == s.SKILL_PB || lastSkill == s.SKILL_COMBATIVE_STRIKE || lastSkill == s.SKILL_COMBATIVE_STRIKE_2)) {
			sub = 30
			duration = 3185
		}
		if (event.skill.id == s.SKILL_REAPING && (lastSkill == s.SKILL_BLADE_WALTZ || lastSkill == s.SKILL_BLADE_WALTZ_SECOND_CAST || lastSkill == s.SKILL_COMBATIVE_STRIKE || lastSkill == s.SKILL_COMBATIVE_STRIKE_2 || lastSkill == s.SKILL_ROB)) {
			sub = 30
			duration = 1980
		}
		if (event.skill.id == s.SKILL_SCYTHE && dgActive) sub = sub + s.SKILL_SCYTHE_3 - s.SKILL_SCYTHE
		if (event.skill.id == s.SKILL_ROB && dgActive) {
			sub = sub + s.SKILL_ROB_3 - s.SKILL_ROB
			if (duration == s.SKILL_ROB_DURATION) {
				duration = 3330
			}
		}
		if (event.skill.id == s.SKILL_BD && dgActive) sub = sub + s.SKILL_BD_3 - s.SKILL_BD
		if (event.skill.id == s.SKILL_BD && sub == 30) {
			disabSkill[s.SKILL_COMBATIVE_STRIKE] = true
			setTimeout(function () { disabSkill[s.SKILL_COMBATIVE_STRIKE] = false }, 1565 / aspd)
		}
		if (event.skill.id == s.SKILL_DEADLY_GAMBLE) speed = 1.2 / aspd
		if (event.skill.id == s.SKILL_LEAPING && glyphState[21082] == 1) {
			speed = speed * 1.2
			duration = duration / 1.2
		}
		if (event.skill.id == s.SKILL_RISING_FURY_2 && talentState[811910]) speed = speed + (50 / 1400 + talentState[811910] * (15 / 1400))
		if ((glyphState[21040] == 1 || glyphState[21109] == 1) && event.skill.id == s.SKILL_BATTLE_CRY) speed = 1.5
		finish[s.SKILL_CHARGING] = true
		finish[event.skill.id] = false
		atkid[event.skill.id + sub] = atkid_base
		atkid_base--
		finishcheck[event.skill.id] = setTimeout(function (event) { finish[event.skill.id] = true }, (duration / (aspd * speed)), event)
	}

	function forceEnd(event, unkz) {
		mod.toClient('S_ACTION_END', 5, {
			gameId: mod.game.me.gameId,
			loc: {
				x: event.loc.x,
				y: event.loc.y,
				z: event.loc.z
			},
			w: event.w,
			templateId: mod.game.me.templateId,
			skill: event.skill.id + sub,
			type: unkz, //0x02
			id: atkid[event.skill.id + sub],
		})
		clearTimeout(timer[event.skill.id])
	}


	mod.hook('S_EACH_SKILL_RESULT', 14, (event) => {
		if(!enabled) { return;}
		if (event.target === mod.game.me.gameId) {
			if (event.reaction.enable == true) {
				lastSkill = 1
			}
		}

		if (event.source === mod.game.me.gameId) {
			if(event.skill.id == s.SKILL_BLADE_FRENZY || event.skill.id == s.SKILL_BLADE_FRENZY + 30) {
				if(event.value > 9000000 && config.INSTANT_BLADE_FRENZY_CANCEL) {
					var robot17 = require("robotjs");
					robot17.keyTap(BLOCK_KEY);
				}
			}
			var xxyyzz = false;
			if((event.skill.id ==  s.SKILL_AERIAL_SCYTHE_SECOND_CAST) && config.INSTANT_AERIAL_CANCEL) { // aes
				if (event.skill.id != s.SKILL_BLADE_FRENZY && event.skill.id != s.SKILL_BD && (lastSkill == s.SKILL_AERIAL_SCYTHE || lastSkill == s.SKILL_AERIAL_SCYTHE_SECOND_CAST)) xxyyzz = true;
				macroBdLock = false;
				if(config.AUTO_BD_AFTER_AERIAL_SCYTHE && event.skill.id == s.SKILL_AERIAL_SCYTHE_SECOND_CAST && aesBlockActive == 1) {
					var robot18 = require("robotjs");
					setTimeout(() => { // prevents bd from being cast too soon
						for(var i = 0; i < 13; i++) {
							robot18.keyTap(BD_KEY);
						}
					}, 1 / aspd);
				}
				else if(xxyyzz) {
					var robot17 = require("robotjs");
					setTimeout(() => {
						robot17.keyTap(BLOCK_KEY);
					}, 1 / aspd);
				}
			}

			if(Math.floor(event.skill.id / 1e4) == 40) { // blade waltz
				if(!dgActive) { return;}
				if(!bdOnCd && !macroBdLock && config.BLADE_WALTZ_AUTO_BD_DURING_DG) {
					macroBdLock = true;
					var robot17 = require("robotjs");
					
					setTimeout(() => { // prevents bd from being cast too soon
						for(var i = 0; i < 13; i++) {
							robot17.keyTap(BD_KEY);
						}
					}, 1 / aspd);

					setTimeout(() => { // locks bd
						macroBdLock = false;
					}, 400 / aspd);
				}
				if(bdOnCd && !macroRobLock && config.BLADE_WALTZ_AUTO_ROB_DURING_DG_IF_BD_ON_CD) {
					macroRobLock = true;
					var robot17 = require("robotjs");

					setTimeout(() => { // prevents rob from being cast too soon after bw
						for(var i = 0; i < 10; i++) {
							robot17.keyTap(ROB_KEY);
						}
					}, 200 / aspd);

					setTimeout(() => { // locks rob
						macroRobLock = false;
					}, 1400 / aspd);
				}

			} 

			if(Math.floor(event.skill.id / 1e4) == 38 || Math.floor(event.skill.id / 1e4) == 30) { // scythe
				if(!config.INSTANT_SCYTHE_CANCEL) {return;}
				if (event.skill.id != s.SKILL_BLADE_FRENZY && event.skill.id != s.SKILL_BD && lastSkill == s.SKILL_SCYTHE) xxyyzz = true;
				macroBdLock = false;
				if(xxyyzz) {
					var robot17 = require("robotjs");
					setTimeout(() => {
						robot17.keyTap(BLOCK_KEY);
					}, 1 / aspd);
				}

			}

			if(Math.floor(event.skill.id / 1e4) == 39 && tcStacks == 13 && config.AUTO_CANCEL_TC_IF_13_STACKS) { // tc
				var robot17 = require("robotjs");
				robot17.keyTap(BLOCK_KEY);
			}

			if(event.skill.id == s.SKILL_BACKSTAB && config.INSTANT_BACKSTAB_CANCEL) { // backstab
				var robot17 = require("robotjs");
				setTimeout(() => {
					robot17.keyTap(BLOCK_KEY);
				}, 200 / aspd);
			}

			if(event.skill.id == s.SKILL_CHARGING_2 && config.INSTANT_CHARGING_SLASH_CANCEL) { // charge
				if (event.skill.id != s.SKILL_BD && lastSkill == s.SKILL_CHARGING_2) xxyyzz = true;
				var robot17 = require("robotjs");
				if(config.AUTO_BD_AFTER_CHS && !bdOnCd) {
					setTimeout(() => { // prevents rob from being cast too soon after bw
						for(var i = 0; i < 15; i++) {
							robot17.keyTap(BD_KEY);
						}
					}, 1 / aspd);
				}
				else if(xxyyzz) {
					robot17.keyTap(BLOCK_KEY);
				}
			}

			if(event.skill.id == s.SKILL_RISING_FURY_2) { // rf
				var robot17 = require("robotjs");
				if(config.AUTO_BD_AFTER_RF) {
					if(!bdOnCd) {
						setTimeout(() => { // prevents rob from being cast too soon after bw
							for(var i = 0; i < 15; i++) {
								robot17.keyTap(BD_KEY);
							}
						}, 1 / aspd);
					}
					else {
						robot17.keyTap(BLOCK_KEY);
					}
				}
			}

			if(Math.floor(event.skill.id / 1e4) == 17) { // vortex
				var robot17 = require("robotjs");
				if(config.AUTO_BD_AFTER_VORTEX) {
					if(!bdOnCd) {
						setTimeout(() => { // prevents rob from being cast too soon after bw
							for(var i = 0; i < 15; i++) {
								robot17.keyTap(BD_KEY);
							}
						}, 1 / aspd);
					}
					else {
						robot17.keyTap(BLOCK_KEY);
					}
				}
			}

			if(Math.floor(event.skill.id / 1e4) == 31) { // reaping slash
				if(config.INSTANT_REAPING_SLASH_CANCEL) {
					var robot17 = require("robotjs");
					robot17.keyTap(BLOCK_KEY);
				}
			}
			if(Math.floor(event.skill.id / 1e4) == 13) { // retaliate
					var robot17 = require("robotjs");
					robot17.keyTap(BLOCK_KEY);
			}
			if(event.skill.id == 11200) {
				if(config.INSTANT_AUTO_ATTACK1_CANCEL) {
					var robot17 = require("robotjs");
					robot17.keyTap(BLOCK_KEY);
				}
			}
		}
	})

	mod.hook('S_CREST_INFO', 2, (event) => {
	  if (!enabled) { return }
		event.crests.forEach(function (element) {
			glyphState[element.id] = element.enable
		})
	})

	mod.hook('S_CREST_APPLY', 2, (event) => {
		if (!enabled) { return }
		glyphState[event.id] = event.enable2
	})

	mod.hook('S_ABNORMALITY_BEGIN', 3, (event) => {
		if (!enabled) return

		if (event.target !== mod.game.me.gameId) return
		if (event.id == 100297) dstance = true
		if (event.id == 104100) blade_waltz_crit_buff = true
	})

	mod.hook('S_ABNORMALITY_END', 1, (event) => {
		if (!enabled) return

		if (event.target !== mod.game.me.gameId) return
		if (event.id == 100297) dstance = false
		if (event.id == 104100) blade_waltz_crit_buff = false
	})

	mod.hook('C_PRESS_SKILL', 4, { order: -1000, filter: { fake: null } }, event => {
		if (!enabled) return
		if (event.skill.id != s.SKILL_BLADE_WALTZ && event.skill.id != s.SKILL_BLADE_WALTZ_SECOND_CAST) {
			disabSkill[s.SKILL_BLADE_WALTZ] = false
			disabSkill[s.SKILL_BLADE_WALTZ_SECOND_CAST] = false
		}

		if (event.skill.id == s.SKILL_BLOCK && event.press == true && dstance) {
			blockActive = 1
			bdBlockActive = 0
			aesBlockActive = 0
			scytheBlockActive = 0
			robBlockActive = 0
			instantBlockActive = 1
			clearTimeout(blockX)
			clearTimeout(reapLock)
			clearTimeout(roBLock)
			clearTimeout(tCLock)
			clearTimeout(bDLock)
			clearTimeout(scytheLock)
			clearTimeout(rollLock)
			clearTimeout(tOBLock)
			disabSkill[s.SKILL_ROLL] = false
			disabSkill[s.SKILL_SCYTHE] = false
			disabSkill[s.SKILL_BD] = false
			disabSkill[s.SKILL_ROB] = false
			disabSkill[s.SKILL_TOB] = false
			disabSkill[s.SKILL_REAPING] = false
			disabSkill[s.SKILL_TC] = false
			disabSkill[s.SKILL_COMBATIVE_STRIKE] = false
			disabSkill[s.SKILL_PB] = false
			if (timer[lastSkill]) clearTimeout(timer[lastSkill])
		}


		// ISSUE HERE WITH block, it casts twice, by simply removing the emulation, it now supports other addons
	/*	if (event.skill.id == s.SKILL_BLOCK && event.press == false && dstance) {
			console.log('C_PRESS_SKILL IF');
			clearTimeout(blockX)
			blockX = setTimeout(function () { blockActive = 0 }, 1000)
			instantBlockActive = 0
			mod.toClient('S_ACTION_END', 5, {
				gameId: mod.game.me.gameId,
				loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
				w: event.w,
				templateId: mod.game.me.templateId,
				skill: event.skill.id,
				type: 10,
				id: atkid[event.skill.id],
			})
		}
		if (event.skill.id == s.SKILL_BLOCK && event.press == true && dstance) {
			console.log('event.skill.id == s.SKILL_BLOCK && event.press == true && dstance');
			blockActive = 1
			bdBlockActive = 0
			instantBlockActive = 1
			clearTimeout(blockX)
			forceEnd(lastEvent, 6)
			clearTimeout(reapLock)
			clearTimeout(roBLock)
			clearTimeout(tCLock)
			clearTimeout(bDLock)
			clearTimeout(scytheLock)
			clearTimeout(rollLock)
			clearTimeout(tOBLock)
			disabSkill[s.SKILL_ROLL] = false
			disabSkill[s.SKILL_SCYTHE] = false
			disabSkill[s.SKILL_BD] = false
			disabSkill[s.SKILL_ROB] = false
			disabSkill[s.SKILL_TOB] = false
			disabSkill[s.SKILL_REAPING] = false
			disabSkill[s.SKILL_TC] = false
			disabSkill[s.SKILL_COMBATIVE_STRIKE] = false
			disabSkill[s.SKILL_PB] = false
			if (timer[lastSkill]) clearTimeout(timer[lastSkill])

			if (finish[s.SKILL_RISING_FURY_1] == false && !cancelAdvanced) {
				console.log('finish[s.SKILL_RISING_FURY_1] == false')
				setTimeout(function (event) {
					if (finish[s.SKILL_RISING_FURY_2] != false && instantBlockActive == 1) {
						atkid[event.skill.id] = atkid_base
						atkid_base--
						mod.toClient('S_ACTION_STAGE', mod.majorPatchVersion >= 75 ? 9 : 7, {
							gameId: mod.game.me.gameId,
							loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
							w: event.w,
							templateId: mod.game.me.templateId,
							skill: event.skill.id,
							stage: 0,
							speed: 1,
							...(mod.majorPatchVersion >= 75 ? { projectileSpeed: 1 } : 0),
							id: atkid[event.skill.id],
							effectScale: 1.0, moving: false, dest: { x: 0, y: 0, Z: 0 }, target: 0, movement: [],
						})
					}
				}, 200, event)
			} else {
				console.log('ELSE - finish[s.SKILL_RISING_FURY_1] == false')
				atkid[event.skill.id] = atkid_base
				atkid_base--
				mod.toClient('S_ACTION_STAGE', mod.majorPatchVersion >= 75 ? 9 : 7, {
					gameId: mod.game.me.gameId,
					loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
					w: event.w,
					templateId: mod.game.me.templateId,
					skill: event.skill.id,
					stage: 0,
					speed: 1,
					...(mod.majorPatchVersion >= 75 ? { projectileSpeed: 1 } : 0),
					id: atkid[event.skill.id],
					effectScale: 1.0, moving: false, dest: { x: 0, y: 0, Z: 0 }, target: 0, movement: [],
				})
			}
		} */

		if (event.press == true) {
			lastSkill = event.skill.id
			lastEvent = event
		}
	})

	mod.hook('C_START_SKILL', 7, { order: -1000, filter: { fake: null } }, (event) => {
		if (!enabled) return
		if (disabSkill[event.skill.id] == 'undefined') disabSkill[event.skill.id] = false
		if (event.skill.id != s.SKILL_BLADE_WALTZ && event.skill.id != s.SKILL_BLADE_WALTZ_SECOND_CAST) {
			disabSkill[s.SKILL_BLADE_WALTZ] = false
			disabSkill[s.SKILL_BLADE_WALTZ_SECOND_CAST] = false
		}
		if (event.skill.id == s.SKILL_BLADE_WALTZ || event.skill.id == s.SKILL_BLADE_WALTZ_SECOND_CAST || event.skill.id == s.SKILL_AERIAL_SCYTHE) {
			disabSkill[s.SKILL_ROLL] = false
			disabSkill[s.SKILL_SCYTHE] = false
			disabSkill[s.SKILL_BD] = false
			disabSkill[s.SKILL_ROB] = false
			disabSkill[s.SKILL_TOB] = false
			disabSkill[s.SKILL_REAPING] = false
			disabSkill[s.SKILL_TC] = false
		}

		let xxyyzz = false
	//	console.log('last skill: ' + lastSkill + ' | ' + s.SKILL_AERIAL_SCYTHE_SECOND_CAST)
		if (!disabSkill[event.skill.id] || (unlockAll && event.skill.id != lastSkill)) {
			unlockAll = false
			if (event.skill.id != s.SKILL_ROB && event.skill.id != s.SKILL_REAPING && event.skill.id != s.SKILL_TC && lastSkill == s.SKILL_COMBATIVE_STRIKE && cancelAdvanced) xxyyzz = true
			if (event.skill.id != s.SKILL_ROB && event.skill.id != s.SKILL_REAPING && event.skill.id != s.SKILL_TC && lastSkill == s.SKILL_COMBATIVE_STRIKE_2 && cancelAdvanced) xxyyzz = true
			
		//	if ((event.skill.id != s.SKILL_BD || (event.skill.id == s.SKILL_BD && robBlockActive == 0)) && lastSkill == s.SKILL_ROB && cancelAdvanced) xxyyzz = true

			if (event.skill.id != s.SKILL_SCYTHE && event.skill.id != s.SKILL_TC && lastSkill == s.SKILL_PB && cancelAdvanced) xxyyzz = true
			if (lastSkill == s.SKILL_RISING_FURY_1 && cancelAdvanced) xxyyzz = true
			if (event.skill.id != s.SKILL_BD && lastSkill == s.SKILL_RISING_FURY_2 && cancelAdvanced) xxyyzz = true
			if (event.skill.id != s.SKILL_BD && lastSkill == s.SKILL_VORTEX && cancelAdvanced) xxyyzz = true
			if (lastSkill == s.SKILL_REAPING && cancelAdvanced) xxyyzz = true
			if (lastSkill == s.SKILL_AERIAL_SCYTHE_SECOND_CAST && event.skill.id != s.SKILL_BLADE_FRENZY && cancelAdvanced) xxyyzz = true
			if (event.skill.id != s.SKILL_BLADE_FRENZY && event.skill.id != s.SKILL_BD && lastSkill == s.SKILL_SCYTHE && cancelAdvanced) xxyyzz = true
			if (event.skill.id != s.SKILL_SCYTHE && event.skill.id != s.SKILL_REAPING && event.skill.id != s.SKILL_BD && lastSkill == s.SKILL_ROB && cancelAdvanced) xxyyzz = true
			if (event.skill.id != s.SKILL_SCYTHE && event.skill.id != s.SKILL_BD && lastSkill == s.SKILL_BD && cancelAdvanced) xxyyzz = true
			if (event.skill.id != s.SKILL_ROB && lastSkill == s.SKILL_CASCADE && cancelAdvanced) xxyyzz = true
			if ((event.skill.id != s.SKILL_BD || (event.skill.id == s.SKILL_BD && tbBlockActive == 0)) && lastSkill == s.SKILL_TOB && cancelAdvanced) xxyyzz = true
			if (lastSkill == s.SKILL_BATTLE_CRY && cancelAdvanced) xxyyzz = true
			if (lastSkill == s.SKILL_INFURIATE && cancelAdvanced) xxyyzz = true
			if (event.skill.id != s.SKILL_BD && lastSkill == s.SKILL_VORTEX_EX_2 && cancelAdvanced) xxyyzz = true; // this fixes vortex chains

			if (xxyyzz == true) {
				
				cancelAdvanced = false
				disabSkill = []
				mod.toServer('C_PRESS_SKILL', 4, {
					skill: s.SKILL_BLOCK,
					press: true,
					loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
					w: event.w,
				})
				mod.toServer('C_PRESS_SKILL', 4, {
					skill: s.SKILL_BLOCK,
					press: false,
					loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
					w: event.w,
				})
			}
			if (event.skill.id == s.SKILL_DEADLY_GAMBLE) {
				dgActive = true
				if (glyphState[21106] == 1 && dgTal) {
					setTimeout(function () { dgActive = false }, 29000)
				}
				else if (glyphState[21106] == 1) {
					setTimeout(function () { dgActive = false }, 25000)
				}
				else {
					setTimeout(function () { dgActive = false }, 21000)
				}
				disabSkill[event.skill.id] = true
				skillCheck(event, s.SKILL_DEADLY_GAMBLE_DURATION)
			}

			if (event.skill.id == s.SKILL_BATTLE_CRY) {
				disabSkill[event.skill.id] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_BATTLE_CRY] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_BATTLE_CRY_DURATION / aspd)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_BATTLE_CRY_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_BATTLE_CRY_DURATION / aspd)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_BATTLE_CRY_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_BATTLE_CRY_DURATION / aspd)
				skillCheck(event, s.SKILL_BATTLE_CRY_DURATION)
				blockCancel(config.SHOUTCANCEL_DELAY / aspd, event)
			/*	if (config.SHOUTCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						forceEnd(event, 10)
						unlockAll = true
					}, config.SHOUTCANCEL_DELAY / aspd, event)
				}*/
			}
			if (event.skill.id == s.SKILL_INFURIATE && dstance) {
				disabSkill[event.skill.id] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_INFURIATE] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_INFURIATE_DURATION / aspd)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_INFURIATE_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_INFURIATE_DURATION / aspd)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_INFURIATE_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_INFURIATE_DURATION / aspd)
				skillCheck(event, s.SKILL_INFURIATE_DURATION)
				if (config.ENRAGECANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						forceEnd(event, 10)
						unlockAll = true
					}, config.ENRAGECANCEL_DELAY / aspd, event)
				}
			}
			if (event.skill.id == s.SKILL_RISING_FURY_1) {
				disabSkill[event.skill.id] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_RISING_FURY_1] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_RISING_FURY_1_DURATION / aspd)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_RISING_FURY_1_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_RISING_FURY_1_DURATION / aspd)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_RISING_FURY_1_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_RISING_FURY_1_DURATION / aspd)
				skillCheck(event, s.SKILL_RISING_FURY_1_DURATION)
				if (config.RFCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						if (lastSkill != s.SKILL_RISING_FURY_1) return
						forceEnd(event, 10)
						unlockAll = true
					}, config.RFCANCEL_DELAY / aspd, event)
				}
			}
			if (event.skill.id == s.SKILL_RISING_FURY_2) {
				disabSkill[event.skill.id] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_RISING_FURY_2] = false }, GLOBAL_LOCK_DELAY)
				skillCheck(event, s.SKILL_RISING_FURY_2_DURATION)
				if (config.RF2CANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						if (lastSkill != s.SKILL_RISING_FURY_2) return
						forceEnd(event, 10)
						unlockAll = true
					}, config.RF2CANCEL_DELAY / aspd, event)
				}
			}
			if (event.skill.id == s.SKILL_COMBATIVE_STRIKE) {
				disabSkill[s.SKILL_COMBATIVE_STRIKE] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_COMBATIVE_STRIKE] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_COMBATIVE_STRIKE_DURATION / aspd)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_COMBATIVE_STRIKE_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = false
				clearTimeout(roBLock)
				skillCheck(event, s.SKILL_COMBATIVE_STRIKE_DURATION)
				if (config.CSCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						if (lastSkill != s.SKILL_COMBATIVE_STRIKE) return
						forceEnd(event, 10)
						unlockAll = true
					}, config.CSCANCEL_DELAY / aspd, event)
				}
			}
			if (event.skill.id == s.SKILL_COMBATIVE_STRIKE_2) {
				disabSkill[s.SKILL_COMBATIVE_STRIKE_2] = true
				var timer2 = setTimeout(function () { disabSkill[s.SKILL_COMBATIVE_STRIKE_2] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_COMBATIVE_STRIKE_DURATION / aspd)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_COMBATIVE_STRIKE_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = false
				clearTimeout(roBLock)
				skillCheck(event, s.SKILL_COMBATIVE_STRIKE_DURATION)
				if (config.CSCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						if (lastSkill != s.SKILL_COMBATIVE_STRIKE_2) return
						forceEnd(event, 10)
						unlockAll = true
					}, config.CSCANCEL_DELAY / aspd, event)
				}
			}
			if (event.skill.id == s.SKILL_REAPING && finish[s.SKILL_CHARGING] == true) {
				disabSkill[event.skill.id] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, GLOBAL_LOCK_DELAY)
				skillCheck(event, s.SKILL_REAPING_DURATION)
				if (sub == 0) {
					if (config.REAPINGCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							forceEnd(event, 10)
							unlockAll = true
						}, config.REAPINGCANCEL_DELAY + 200 / aspd, event)
					}
				}
				if (sub == 30) {
					if (config.CHAINREAPINGCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							forceEnd(event, 10)
							unlockAll = true
						}, config.CHAINREAPINGCANCEL_DELAY + 200 / aspd, event)
					}
				}
			}
			if (event.skill.id == s.SKILL_TOB) {
				disabSkill[event.skill.id] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_TOB] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_TOB_DURATION / aspd)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_TOB_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_TOB_DURATION / aspd)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_TOB_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_TOB_DURATION / aspd)
				tbBlockActive = 0
				skillCheck(event, s.SKILL_TOB_DURATION)
				if (config.TOBCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						forceEnd(event, 10)
						unlockAll = true
					}, config.TOBCANCEL_DELAY / aspd, event)
				}
			}
			if (event.skill.id == s.SKILL_ROB && finish[s.SKILL_CHARGING] == true) {
				clearTimeout(bDLock)
				clearTimeout(tCLock)
				disabSkill[event.skill.id] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_ROB_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_ROB_DURATION / aspd)
				skillCheck(event, s.SKILL_ROB_DURATION)
				if (sub == 0) {
					if (config.RAWROBCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							if (lastSkill != s.SKILL_ROB) return
							forceEnd(event, 10)
							unlockAll = true
						}, config.RAWROBCANCEL_DELAY / aspd, event)
					}
				}
				if (sub == 30) {
					if (config.CHAINROBCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							if (lastSkill != s.SKILL_ROB) return
							forceEnd(event, 10)
							unlockAll = true
						}, config.CHAINROBCANCEL_DELAY / aspd, event)
					}
				}
				if (sub == (s.SKILL_ROB_3 - s.SKILL_ROB)) {
					if (config.RAWROBCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							if (lastSkill != s.SKILL_ROB) return
							forceEnd(event, 10)
							unlockAll = true
						}, (config.RAWROBCANCEL_DELAY + 100) / aspd, event)
					}
				}
				if (sub == (s.SKILL_ROB_3 - s.SKILL_ROB + 30)) {
					if (config.CHAINROBCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							if (lastSkill != s.SKILL_ROB) return
							forceEnd(event, 10)
							unlockAll = true
						}, (config.CHAINROBCANCEL_DELAY + 100) / aspd, event)
					}
				}
			}
			if (event.skill.id == s.SKILL_SCYTHE && finish[s.SKILL_CHARGING] == true) {
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_SCYTHE_DURATION / aspd)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_SCYTHE_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_SCYTHE_DURATION / aspd)
				disabSkill[event.skill.id] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, GLOBAL_LOCK_DELAY)
				skillCheck(event, s.SKILL_SCYTHE_DURATION)
				if (sub == 0 || sub == (s.SKILL_SCYTHE_3 - s.SKILL_SCYTHE)) {
					if (config.RAWSCYTHECANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							forceEnd(event, 10)
							unlockAll = true
						}, config.RAWSCYTHECANCEL_DELAY / aspd, event)
					}
				}
				if (sub == 30 || sub == (s.SKILL_SCYTHE_3 - s.SKILL_SCYTHE + 30)) {
					if (config.CHAINSCYTHECANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							forceEnd(event, 10)
							unlockAll = true
						}, config.CHAINSCYTHECANCEL_DELAY / aspd, event)
					}
				}
			}
			if (event.skill.id == s.SKILL_BD && finish[s.SKILL_CHARGING] == true) {
				clearTimeout(reapLock)
				clearTimeout(roBLock)
				clearTimeout(tCLock)
				disabSkill[s.SKILL_SCYTHE] = false
				disabSkill[event.skill.id] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_BD_DURATION / aspd)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_BD_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_BD_DURATION / aspd)
				skillCheck(event, s.SKILL_BD_DURATION)
				instantBlockActive = 0
				blockActive = 0
				if (sub == 0) {
					if (config.RAWBDCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							if (lastSkill != s.SKILL_BD) return
							forceEnd(event, 10)
							unlockAll = true
						}, config.RAWBDCANCEL_DELAY / aspd, event)
					}
				}
				if (sub == 30) {
					if (config.CHAINBDCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							if (lastSkill != s.SKILL_BD) return
							forceEnd(event, 10)
							unlockAll = true
						}, config.CHAINBDCANCEL_DELAY / aspd, event)
					}
				}
				if (sub == (s.SKILL_BD_3 - s.SKILL_BD)) {
					if (config.RAWBDCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							if (lastSkill != s.SKILL_BD) return
							forceEnd(event, 10)
							unlockAll = true
						}, (config.RAWBDCANCEL_DELAY + 100) / aspd, event)
					}
				}
				if (sub == (s.SKILL_BD_3 - s.SKILL_BD + 30)) {
					if (config.CHAINBDCANCEL_DELAY > 0 && dstance) {
						cancelAdvanced = true
						setTimeout(function (event) {
							if (lastSkill != s.SKILL_BD) return
							forceEnd(event, 10)
							unlockAll = true
						}, (config.CHAINBDCANCEL_DELAY + 100) / aspd, event)
					}
				}
			}
			if (event.skill.id == s.SKILL_PB) {
				disabSkill[event.skill.id] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_PB] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_PB_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_PB_DURATION / aspd)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_PB_DURATION / aspd)
				skillCheck(event, s.SKILL_PB_DURATION)
				if (config.PBCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						if (lastSkill != s.SKILL_PB) return
						forceEnd(event, 10)
						unlockAll = true
					}, config.PBCANCEL_DELAY / aspd, event)
				}
			}
			if ((event.skill.id == s.SKILL_VORTEX_EX)) {
				disabSkill[s.SKILL_VORTEX_EX] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_VORTEX_EX] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_VORTEX_DURATION / aspd)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_VORTEX_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_VORTEX_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_VORTEX_DURATION / aspd)
				disabSkill[s.SKILL_COMBATIVE_STRIKE] = true;
				setTimeout(function () { disabSkill[s.SKILL_COMBATIVE_STRIKE] = false}, s.SKILL_VORTEX_DURATION / aspd);

				disabSkill[s.SKILL_TOB] = true;
				tOBLock = setTimeout(function () { disabSkill[s.tOBLock] = false}, s.SKILL_VORTEX_DURATION / aspd);

				disabSkill[s.SKILL_TOB] = true;
				setTimeout(function () { disabSkill[s.SKILL_TOB] = false}, s.SKILL_VORTEX_DURATION / aspd);
				disabSkill[s.SKILL_PB] = true;
				setTimeout(function () { disabSkill[s.SKILL_PB] = false }, s.SKILL_VORTEX_DURATION / aspd);
				disabSkill[s.SKILL_INFURIATE] = true;
				setTimeout(function () { disabSkill[s.SKILL_INFURIATE] = false }, s.SKILL_VORTEX_DURATION / aspd);
				disabSkill[s.SKILL_BATTLE_CRY] = true;
				setTimeout(function () { disabSkill[s.SKILL_BATTLE_CRY] = false }, s.SKILL_VORTEX_DURATION / aspd);
				skillCheck(event, s.SKILL_VORTEX_DURATION)
				if (config.VORTEXCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						if (lastSkill != s.SKILL_VORTEX_EX) return
						forceEnd(event, 10)
						unlockAll = true
					}, config.VORTEXCANCEL_DELAY / aspd, event)
				}
			}
			if ((event.skill.id == s.SKILL_VORTEX_EX_2 )) {
				disabSkill[s.SKILL_VORTEX_EX_2 ] = true
				var timer2 = setTimeout(function () { disabSkill[s.SKILL_VORTEX_EX_2] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_VORTEX_DURATION / aspd)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_VORTEX_DURATION / aspd)
				disabSkill[s.SKILL_ROB] = true
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false }, s.SKILL_VORTEX_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_VORTEX_DURATION / aspd)
				
				disabSkill[s.SKILL_TOB] = true;
				tOBLock = setTimeout(function () { disabSkill[s.tOBLock] = false}, s.SKILL_VORTEX_DURATION / aspd);

				disabSkill[s.SKILL_COMBATIVE_STRIKE] = true;
				setTimeout(function () { disabSkill[s.SKILL_COMBATIVE_STRIKE] = false}, s.SKILL_VORTEX_DURATION / aspd);
				disabSkill[s.SKILL_TOB] = true;
				setTimeout(function () { disabSkill[s.SKILL_TOB] = false}, s.SKILL_VORTEX_DURATION / aspd);
				disabSkill[s.SKILL_PB] = true;
				setTimeout(function () { disabSkill[s.SKILL_PB] = false }, s.SKILL_VORTEX_DURATION / aspd);
				disabSkill[s.SKILL_INFURIATE] = true;
				setTimeout(function () { disabSkill[s.SKILL_INFURIATE] = false }, s.SKILL_VORTEX_DURATION / aspd);
				disabSkill[s.SKILL_BATTLE_CRY] = true;
				setTimeout(function () { disabSkill[s.SKILL_BATTLE_CRY] = false }, s.SKILL_VORTEX_DURATION / aspd);
				skillCheck(event, s.SKILL_VORTEX_DURATION)
				if (config.VORTEXCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true
					setTimeout(function (event) {
						if (lastSkill != s.SKILL_VORTEX_EX_2) return
						forceEnd(event, 10)
						unlockAll = true
					}, config.VORTEXCANCEL_DELAY / aspd, event)
				}
			}
			if (event.skill.id == s.SKILL_CASCADE) {
				disabSkill[event.skill.id] = true
				var timer = setTimeout(function () { disabSkill[s.SKILL_CASCADE] = false }, GLOBAL_LOCK_DELAY)
				disabSkill[s.SKILL_REAPING] = true
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false }, s.SKILL_CASCADE_DURATION / aspd)
				disabSkill[s.SKILL_BD] = true
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false }, s.SKILL_CASCADE_DURATION / aspd)
				disabSkill[s.SKILL_SCYTHE] = true
				scytheLock = setTimeout(function () { disabSkill[s.SKILL_SCYTHE] = false }, s.SKILL_CASCADE_DURATION / aspd)
				disabSkill[s.SKILL_TC] = true
				tCLock = setTimeout(function () { disabSkill[s.SKILL_TC] = false }, s.SKILL_CASCADE_DURATION / aspd)
				skillCheck(event, s.SKILL_CASCADE_DURATION)
				blockCancel(config.CASCADECANCEL_DELAY / aspd, event)
			}
			if (event.skill.id == s.SKILL_LEAPING) {
				disabSkill[event.skill.id] = true;
				var timer = setTimeout(function () { disabSkill[s.SKILL_LEAPING] = false; }, GLOBAL_LOCK_DELAY);
				disabSkill[s.SKILL_ROB] = true;
				roBLock = setTimeout(function () { disabSkill[s.SKILL_ROB] = false; }, s.SKILL_LEAPING_DURATION / aspd);
				disabSkill[s.SKILL_BD] = true;
				bDLock = setTimeout(function () { disabSkill[s.SKILL_BD] = false; }, s.SKILL_LEAPING_DURATION / aspd);
				disabSkill[s.SKILL_REAPING] = true;
				reapLock = setTimeout(function () { disabSkill[s.SKILL_REAPING] = false; }, s.SKILL_LEAPING_DURATION / aspd);
				skillCheck(event, s.SKILL_LEAPING_DURATION)
				if (config.LEAPINGCANCEL_DELAY > 0 && dstance) {
					cancelAdvanced = true;
					setTimeout(function (event) {
						if (lastSkill != s.SKILL_LEAPING) return
						forceEnd(event, 10)
						unlockAll = true
					}, config.LEAPINGCANCEL_DELAY / aspd, event)
				}
			}

		}
		lastSkill = event.skill.id
		lastEvent = event
	})

	function repeater(key, trigger) {
		if (lastSkill == trigger && failsafe < 40) {
			failsafe++;
			var robot17 = require("robotjs");
			robot17.keyTap(key);
			setTimeout(function (key, trigger) { repeater(key, trigger); }, 50, key, trigger);
		}
	}

	mod.hook('C_START_TARGETED_SKILL', 7, { order: -1000, filter: { fake: null } }, event => {
		if (!enabled) return
		let allowCancel = false
		if (!disabSkill[event.skill.id] || (unlockAll && event.skill.id != lastSkill)) {
			unlockAll = false
			if (cancelAdvanced) allowCancel = true
			if (allowCancel == true) {
				cancelAdvanced = false
				mod.toServer('C_PRESS_SKILL', 4, {
					skill: s.SKILL_BLOCK,
					press: true,
					loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
					w: event.w,
				})
				mod.toServer('C_PRESS_SKILL', 4, {
					skill: s.SKILL_BLOCK,
					press: false,
					loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
					w: event.w,
				})
			}
		}
		lastSkill = event.skill.id
		lastEvent = event
	})

	mod.hook('S_START_COOLTIME_SKILL', 3, (event) => {
		if (!enabled) return;
		switch (event.skill.id) {
			case s.SKILL_BD:
			case s.SKILL_BD_2:
			case s.SKILL_BD_3:
			case s.SKILL_BD_4:
				bdOnCd = true;
				setTimeout(function () { bdOnCd = false; }, event.cooldown);
				break;
		}
	});

	mod.hook('S_CREST_MESSAGE', 2, { order: Number.NEGATIVE_INFINITY }, (event) => {
		if (event.type == 6 && event.skill == (s.SKILL_BD || s.SKILL_BD_2 || s.SKILL_BD_2 || s.SKILL_BD_3 || s.SKILL_BD_4)) {
			bdOnCd = false;
		}
	});

	mod.hook('S_PLAYER_STAT_UPDATE', mod.majorPatchVersion >= 93 ? 14 : 13, (event) => {
		if (!enabled) return
		aspd = (event.attackSpeed + event.attackSpeedBonus) / 100
		if (event.curHp == 0) {
			dgActive = false
		}
	})
	
	mod.hook('S_ABNORMALITY_BEGIN', 4, { order: Number.NEGATIVE_INFINITY }, (event) => {
       if (!enabled) return;
		if (!mod.game.me.is(event.target)) return;
		if(A_RUSH_ABNORMALITY.includes(event.id)) { aRushActive = true; }
		if(DEADLY_GAMBLE_ABNORMALITY.includes(event.id)) { dgActive = true;}
    });
	
	    mod.hook('S_ABNORMALITY_END', 1, { order: Number.NEGATIVE_INFINITY }, (event) => {
        if (!enabled) return;
		if (!mod.game.me.is(event.target)) return;
		if(event.id == 101300) { tcStacks = 0;}
		if(A_RUSH_ABNORMALITY_END.includes(event.id)) { aRushActive = false; }
		if(DEADLY_GAMBLE_ABNORMALITY_END.includes(event.id)) { dgActive = false;}
	});
	
	mod.hook('S_ABNORMALITY_REFRESH',2, { order: Number.NEGATIVE_INFINITY}, (event) => {
		if (!enabled) return;
		if (!mod.game.me.is(event.target)) return;
		if(event.id == 101300 && event.stacks == 13 && config.AUTO_CANCEL_TC_IF_13_STACKS) {
			var robot17 = require("robotjs");
			robot17.keyTap(BLOCK_KEY);
			tcStacks = 13;
		}
	})
	
	function blockCancel(cancelTime, event) {
		setTimeout(function () {
			mod.toServer('C_PRESS_SKILL', 4, {
				skill: s.SKILL_BLOCK,
				press: true,
				loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
				w: event.w,
			})
		}, cancelTime)

		setTimeout(function() { 
			mod.toServer('C_PRESS_SKILL', 4, {
			skill: s.SKILL_BLOCK,
			press: false,
			loc: { x: event.loc.x, y: event.loc.y, z: event.loc.z },
			w: event.w,
		})
		 }, cancelTime + 5)

	}



	/*============================ UI and reload stuff ================================ */
	if (global.TeraProxy.GUIMode) {
        ui = new SettingsUI(mod, require('./settingsStructure'), config, {
            alwaysOnTop: true,
            width: 600,
            height: 425
        });
        ui.on('update', settings => {
			// INSTANT
			  config.INSTANT_AERIAL_CANCEL = config.INSTANT_AERIAL_CANCEL;
			  config.INSTANT_SCYTHE_CANCEL = config.INSTANT_SCYTHE_CANCEL;
			  config.INSTANT_BACKSTAB_CANCEL = config.INSTANT_BACKSTAB_CANCEL;
			  config.INSTANT_CHARGING_SLASH_CANCEL = config.INSTANT_CHARGING_SLASH_CANCEL;
			  config.INSTANT_REAPING_SLASH_CANCEL = config.INSTANT_REAPING_SLASH_CANCEL;
			  config.INSTANT_BLADE_FRENZY_CANCEL = config.INSTANT_BLADE_FRENZY_CANCEL;
			  config.INSTANT_AUTO_ATTACK1_CANCEL = config.INSTANT_AUTO_ATTACK1_CANCEL;
			  
			  // macros
			  config.BLADE_WALTZ_AUTO_BD_DURING_DG = config.BLADE_WALTZ_AUTO_BD_DURING_DG;
			  config.BLADE_WALTZ_AUTO_ROB_DURING_DG_IF_BD_ON_CD = config.BLADE_WALTZ_AUTO_ROB_DURING_DG_IF_BD_ON_CD;
			  config.AUTO_CANCEL_TC_IF_13_STACKS = config.AUTO_CANCEL_TC_IF_13_STACKS;
			  config.AUTO_BD_AFTER_BD = config.AUTO_BD_AFTER_BD;
			  config.AUTO_BD_AFTER_BLOCK = config.AUTO_BD_AFTER_BLOCK;
			  config.AUTO_BD_AFTER_SCYTHE = config.AUTO_BD_AFTER_SCYTHE;
			  config.AUTO_BD_AFTER_AERIAL_SCYTHE = config.AUTO_BD_AFTER_AERIAL_SCYTHE;
			  config.AUTO_BD_AFTER_ROB = config.AUTO_BD_AFTER_ROB;
			  config.AUTO_BD_AFTER_CHS = config.AUTO_BD_AFTER_CHS;
			  config.AUTO_BD_AFTER_RF = config.AUTO_BD_AFTER_RF;
			  config.AUTO_BD_AFTER_VORTEX = config.AUTO_BD_AFTER_VORTEX;

			  // normal block cancels stuff

			  config.RF2CANCEL_DELAY = config.RF2CANCEL_DELAY;
			  config.CSCANCEL_DELAY = config.CSCANCEL_DELAY;
			  config.PBCANCEL_DELAY = config.PBCANCEL_DELAY;
			  config.VORTEXCANCEL_DELAY = config.VORTEXCANCEL_DELAY;
			  config.REAPINGCANCEL_DELAY = config.REAPINGCANCEL_DELAY;
			  config.RAWSCYTHECANCEL_DELAY = config.RAWSCYTHECANCEL_DELAY;
			  config.CHAINSCYTHECANCEL_DELAY = config.CHAINSCYTHECANCEL_DELAY;
			  config.RAWROBCANCEL_DELAY = config.RAWROBCANCEL_DELAY;
			  config.CHAINROBCANCEL_DELAY = config.CHAINROBCANCEL_DELAY;
			  config.RAWBDCANCEL_DELAY = config.RAWBDCANCEL_DELAY;
			  config.TOBCANCEL_DELAY = config.TOBCANCEL_DELAY;
			  config.SHOUTCANCEL_DELAY = config.SHOUTCANCEL_DELAY;
			  config.ENRAGECANCEL_DELAY = config.ENRAGECANCEL_DELAY;	
			  config.LEAPINGCANCEL_DELAY = config.LEAPINGCANCEL_DELAY;	

			  config = settings;
			  jsonSave('config.json', config)
        });
        this.destructor = () => {
            if (ui) {
                ui.close();
				ui = null;
            }
        };
    }

	this.saveState = () => {
			const state = {
				
			};
        return state;
    };

	this.saveState = () => {
        mod.command.message("Reloading mod. Please wait until it's finished reloading.");
        return {  
			enabled: true,
			job: 0,
			macroBdLock: false,
			macroRobLock: false
		};
	};

	this.loadState = (state) => {
		enabled = state.enabled;
		job = state.job;
		macroBdLock = false;
		macroRobLock = false;
	};

	this.destructor = function () {
		command.remove('dwarr');
		delete require.cache[require.resolve('path')]
		delete require.cache[require.resolve('fs')]
	}
}