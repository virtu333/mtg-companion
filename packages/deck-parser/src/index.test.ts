import { describe, expect, it } from 'vitest';
import { parseDecklist } from './index';

describe('parseDecklist', () => {
  describe('basic formats', () => {
    it('parses "N CardName" format', () => {
      const result = parseDecklist('4 Lightning Bolt\n2 Scalding Tarn');
      expect(result.mainboard).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Scalding Tarn', quantity: 2 },
      ]);
      expect(result.sideboard).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('parses "Nx CardName" format', () => {
      const result = parseDecklist('4x Lightning Bolt\n2x Scalding Tarn');
      expect(result.mainboard).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Scalding Tarn', quantity: 2 },
      ]);
    });

    it('parses MTGA export format with set code and collector number', () => {
      const result = parseDecklist(
        '4 Lightning Bolt (FDN) 123\n2 Monastery Swiftspear (BRO) 144',
      );
      expect(result.mainboard).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Monastery Swiftspear', quantity: 2 },
      ]);
    });

    it('handles single-card lines', () => {
      const result = parseDecklist('1 Otawara, Soaring City');
      expect(result.mainboard).toEqual([{ name: 'Otawara, Soaring City', quantity: 1 }]);
    });
  });

  describe('sideboard detection', () => {
    it('splits on blank line', () => {
      const input = `4 Lightning Bolt
2 Mountain

2 Pyroblast
1 Smash to Smithereens`;
      const result = parseDecklist(input);
      expect(result.mainboard).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Mountain', quantity: 2 },
      ]);
      expect(result.sideboard).toEqual([
        { name: 'Pyroblast', quantity: 2 },
        { name: 'Smash to Smithereens', quantity: 1 },
      ]);
    });

    it('splits on "Sideboard" header', () => {
      const input = `4 Lightning Bolt
Sideboard
2 Pyroblast`;
      const result = parseDecklist(input);
      expect(result.mainboard).toEqual([{ name: 'Lightning Bolt', quantity: 4 }]);
      expect(result.sideboard).toEqual([{ name: 'Pyroblast', quantity: 2 }]);
    });

    it('handles "SB:" prefix on individual lines', () => {
      const input = `4 Lightning Bolt
SB: 2 Pyroblast
SB: 1 Smash to Smithereens`;
      const result = parseDecklist(input);
      expect(result.mainboard).toEqual([{ name: 'Lightning Bolt', quantity: 4 }]);
      expect(result.sideboard).toEqual([
        { name: 'Pyroblast', quantity: 2 },
        { name: 'Smash to Smithereens', quantity: 1 },
      ]);
    });

    it('handles case-insensitive sideboard marker', () => {
      const input = `4 Lightning Bolt
sideboard
2 Pyroblast`;
      const result = parseDecklist(input);
      expect(result.sideboard).toEqual([{ name: 'Pyroblast', quantity: 2 }]);
    });
  });

  describe('comments and ignored lines', () => {
    it('skips // comments', () => {
      const input = `// My Burn Deck
4 Lightning Bolt
// This is great
2 Mountain`;
      const result = parseDecklist(input);
      expect(result.mainboard).toHaveLength(2);
      expect(result.errors).toEqual([]);
    });

    it('skips # comments', () => {
      const input = `# My Burn Deck
4 Lightning Bolt`;
      const result = parseDecklist(input);
      expect(result.mainboard).toHaveLength(1);
      expect(result.errors).toEqual([]);
    });

    it('skips "Deck" header from Arena exports', () => {
      const input = `Deck
4 Lightning Bolt (FDN) 123

Sideboard
2 Pyroblast (ICE) 212`;
      const result = parseDecklist(input);
      expect(result.mainboard).toEqual([{ name: 'Lightning Bolt', quantity: 4 }]);
      expect(result.sideboard).toEqual([{ name: 'Pyroblast', quantity: 2 }]);
    });

    it('skips "Companion" and "Commander" headers', () => {
      const input = `Companion
4 Lightning Bolt
Commander
2 Mountain`;
      const result = parseDecklist(input);
      expect(result.mainboard).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Mountain', quantity: 2 },
      ]);
    });
  });

  describe('error handling', () => {
    it('reports unparseable lines with line numbers', () => {
      const input = `4 Lightning Bolt
this is not a card
2 Mountain`;
      const result = parseDecklist(input);
      expect(result.mainboard).toHaveLength(2);
      expect(result.errors).toEqual([
        { line: 2, text: 'this is not a card', reason: 'Could not parse card entry' },
      ]);
    });

    it('reports multiple errors', () => {
      const input = `bad line 1
4 Lightning Bolt
another bad line`;
      const result = parseDecklist(input);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].line).toBe(1);
      expect(result.errors[1].line).toBe(3);
    });

    it('handles empty input', () => {
      const result = parseDecklist('');
      expect(result.mainboard).toEqual([]);
      expect(result.sideboard).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('handles whitespace-only input', () => {
      const result = parseDecklist('   \n  \n   ');
      expect(result.mainboard).toEqual([]);
      expect(result.sideboard).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles DFC card names', () => {
      const result = parseDecklist('4 Bloodsoaked Insight // Sanguine Morass');
      expect(result.mainboard).toEqual([
        { name: 'Bloodsoaked Insight // Sanguine Morass', quantity: 4 },
      ]);
    });

    it('handles cards with apostrophes', () => {
      const result = parseDecklist("4 Frodo's Ring");
      expect(result.mainboard).toEqual([{ name: "Frodo's Ring", quantity: 4 }]);
    });

    it('handles cards with commas', () => {
      const result = parseDecklist('1 Emrakul, the Aeons Torn');
      expect(result.mainboard).toEqual([{ name: 'Emrakul, the Aeons Torn', quantity: 1 }]);
    });

    it('handles Windows-style line endings', () => {
      const result = parseDecklist('4 Lightning Bolt\r\n2 Mountain\r\n');
      expect(result.mainboard).toHaveLength(2);
    });

    it('handles leading/trailing blank lines', () => {
      const result = parseDecklist('\n\n4 Lightning Bolt\n2 Mountain\n\n');
      expect(result.mainboard).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Mountain', quantity: 2 },
      ]);
    });

    it('does not treat leading blank lines as sideboard separator', () => {
      const input = `\n\n4 Lightning Bolt\n2 Mountain`;
      const result = parseDecklist(input);
      // All should be mainboard since blank lines were before any cards
      expect(result.mainboard).toHaveLength(2);
      expect(result.sideboard).toHaveLength(0);
    });

    it('handles a realistic 60-card decklist', () => {
      const input = `4 Goblin Guide
4 Monastery Swiftspear
4 Eidolon of the Great Revel
4 Lightning Bolt
4 Lava Spike
4 Rift Bolt
4 Searing Blaze
4 Skullcrack
2 Light Up the Stage
4 Inspiring Vantage
2 Sacred Foundry
4 Sunbaked Canyon
16 Mountain

Sideboard
4 Kor Firewalker
3 Path to Exile
2 Rest in Peace
2 Smash to Smithereens
2 Roiling Vortex
2 Sanctifier en-Vec`;
      const result = parseDecklist(input);
      const mainTotal = result.mainboard.reduce((sum, e) => sum + e.quantity, 0);
      const sideTotal = result.sideboard.reduce((sum, e) => sum + e.quantity, 0);
      expect(mainTotal).toBe(60);
      expect(sideTotal).toBe(15);
      expect(result.errors).toEqual([]);
    });
  });
});
