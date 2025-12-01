/**
 * Combat Commands - Command Pattern Module Exports
 *
 * Provides Command Pattern implementation for combat actions.
 * Each action is encapsulated as a command with validate/execute/undo.
 *
 * @example
 * const { FireCommand, commandInvoker } = require('./commands');
 * const cmd = new FireCommand({ combat, actor, target, weapon });
 * const result = commandInvoker.execute(cmd, combatId);
 *
 * @see README.md Architecture Patterns table
 * @see .claude/DESIGN-PATTERN-REFACTOR.md Stage 4
 */

const { BaseCommand } = require('./BaseCommand');
const { CommandInvoker, commandInvoker } = require('./CommandInvoker');
const { FireCommand } = require('./FireCommand');
const { MissileCommand } = require('./MissileCommand');
const { PointDefenseCommand } = require('./PointDefenseCommand');
const { SandcasterCommand } = require('./SandcasterCommand');
const { EndTurnCommand } = require('./EndTurnCommand');

module.exports = {
  // Base
  BaseCommand,

  // Invoker
  CommandInvoker,
  commandInvoker,

  // Commands (100% - Stage 4 Complete)
  FireCommand,
  MissileCommand,
  PointDefenseCommand,
  SandcasterCommand,
  EndTurnCommand
};
