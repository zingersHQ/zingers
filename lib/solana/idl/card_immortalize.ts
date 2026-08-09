/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/card_immortalize.json`.
 */
export type CardImmortalize = {
  "address": "FNjvsSSqg8VcEuvRpXT1BjGWFe2BWwiQHo6qjoSUme3U",
  "metadata": {
    "name": "cardImmortalize",
    "version": "0.2.0",
    "spec": "0.1.0",
    "description": "Lean Immortalize: burn fuel + mint unique SPL card (PDA mint authority)"
  },
  "instructions": [
    {
      "name": "immortalize",
      "discriminator": [
        145,
        187,
        205,
        115,
        214,
        236,
        246,
        155
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "mindCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "year"
              },
              {
                "kind": "arg",
                "path": "mindHash"
              }
            ]
          }
        },
        {
          "name": "careerStamp",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  114,
                  101,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "year"
              },
              {
                "kind": "arg",
                "path": "mindHash"
              },
              {
                "kind": "arg",
                "path": "mintIndex"
              }
            ]
          }
        },
        {
          "name": "voucherUsed",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "fuelMint",
          "writable": true
        },
        {
          "name": "ownerFuelAta",
          "writable": true
        },
        {
          "name": "cardMint",
          "docs": [
            "Fresh mint keypair — created + initialized in handler"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "ownerCardAta",
          "docs": [
            "Fresh token account keypair — created + initialized in handler"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "mindHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "burnAmount",
          "type": "u64"
        },
        {
          "name": "mintIndex",
          "type": "u16"
        },
        {
          "name": "year",
          "type": "u32"
        },
        {
          "name": "genesis",
          "type": "u8"
        },
        {
          "name": "exp",
          "type": "i64"
        },
        {
          "name": "nonce",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "metaHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "voucherIssuer"
        },
        {
          "name": "fuelMint"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxPerMind",
          "type": "u16"
        },
        {
          "name": "fuelDecimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setAuthority",
      "discriminator": [
        133,
        250,
        37,
        21,
        110,
        163,
        26,
        121
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setMaxPerMind",
      "discriminator": [
        120,
        8,
        57,
        199,
        221,
        13,
        8,
        175
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "maxPerMind",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setPaused",
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setVoucherIssuer",
      "discriminator": [
        119,
        241,
        45,
        221,
        152,
        178,
        108,
        151
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newIssuer",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "careerStamp",
      "discriminator": [
        250,
        93,
        232,
        66,
        80,
        147,
        193,
        159
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "mindCounter",
      "discriminator": [
        199,
        88,
        231,
        36,
        217,
        74,
        219,
        146
      ]
    },
    {
      "name": "voucherUsed",
      "discriminator": [
        217,
        180,
        20,
        250,
        212,
        53,
        7,
        44
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "badMax",
      "msg": "Invalid max_per_mind"
    },
    {
      "code": 6001,
      "name": "badDecimals",
      "msg": "Fuel decimals mismatch"
    },
    {
      "code": 6002,
      "name": "badBurn",
      "msg": "Invalid burn amount"
    },
    {
      "code": 6003,
      "name": "badGenesis",
      "msg": "Invalid genesis flag"
    },
    {
      "code": 6004,
      "name": "voucherExpired",
      "msg": "Voucher expired"
    },
    {
      "code": 6005,
      "name": "badEd25519",
      "msg": "Ed25519 voucher missing or invalid"
    },
    {
      "code": 6006,
      "name": "mindFull",
      "msg": "Mind Immortal slots full"
    },
    {
      "code": 6007,
      "name": "badMintIndex",
      "msg": "mint_index must be count+1"
    },
    {
      "code": 6008,
      "name": "badCounter",
      "msg": "Mind counter mismatch"
    },
    {
      "code": 6009,
      "name": "paused",
      "msg": "Program paused"
    },
    {
      "code": 6010,
      "name": "badAdmin",
      "msg": "Bad admin authority"
    },
    {
      "code": 6011,
      "name": "badTokenAccount",
      "msg": "Bad SPL token account"
    },
    {
      "code": 6012,
      "name": "badCardMint",
      "msg": "Card mint post-condition failed"
    }
  ],
  "types": [
    {
      "name": "careerStamp",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "mindHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "cardMint",
            "type": "pubkey"
          },
          {
            "name": "mintIndex",
            "type": "u16"
          },
          {
            "name": "year",
            "type": "u32"
          },
          {
            "name": "genesis",
            "type": "u8"
          },
          {
            "name": "burnAmount",
            "type": "u64"
          },
          {
            "name": "metaHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "voucherIssuer",
            "type": "pubkey"
          },
          {
            "name": "fuelMint",
            "type": "pubkey"
          },
          {
            "name": "maxPerMind",
            "type": "u16"
          },
          {
            "name": "fuelDecimals",
            "type": "u8"
          },
          {
            "name": "paused",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "mintAuthorityBump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "Forward-compat (version flags, fee bps, etc.). Keep zeroed."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "mindCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mindHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "year",
            "type": "u32"
          },
          {
            "name": "count",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voucherUsed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nonce",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
