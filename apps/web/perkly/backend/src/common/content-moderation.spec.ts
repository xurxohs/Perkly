import { BadRequestException } from '@nestjs/common';
import { assertAcceptableUserContent } from './content-moderation';

describe('assertAcceptableUserContent', () => {
  it.each(['сука', 'б л я д ь', 'f.u.c.k', `f\u200Buck`, 'n@zi'])(
    'rejects normalized or obfuscated blocked content: %s',
    (value) => {
      expect(() => assertAcceptableUserContent(value)).toThrow(
        BadRequestException,
      );
    },
  );

  it('rejects more than three links', () => {
    expect(() =>
      assertAcceptableUserContent(
        [
          'https://one.example',
          'https://two.example',
          'https://three.example',
          'https://four.example',
        ].join(' '),
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    'Большая выставка для всей семьи',
    'A classic kitchen offer',
    [
      'https://one.example',
      'https://two.example',
      'https://three.example',
    ].join(' '),
  ])('allows ordinary content: %s', (value) => {
    expect(() => assertAcceptableUserContent(value)).not.toThrow();
  });
});
