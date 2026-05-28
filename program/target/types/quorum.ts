/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/quorum.json`.
 */
export type Quorum = {
  "address": "DVxHFqsi2zgxvMLGjmtEBBPJ8o4dFBVWtdSHt77sMMrk",
  "metadata": {
    "name": "quorum",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Quorum Protocol - Community-validated token launchpad"
  },
  "instructions": [
    {
      "name": "castSocialVote",
      "discriminator": [
        116,
        205,
        135,
        19,
        196,
        133,
        190,
        1
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "socialVote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "voter",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "closeSocialPhase",
      "discriminator": [
        99,
        35,
        159,
        172,
        168,
        80,
        12,
        44
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "contribute",
      "discriminator": [
        82,
        33,
        68,
        131,
        32,
        0,
        205,
        95
      ],
      "accounts": [
        {
          "name": "platform",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "contribution",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  105,
                  98,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "contributor"
              }
            ]
          }
        },
        {
          "name": "projectVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "contributor",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createProject",
      "discriminator": [
        148,
        219,
        181,
        42,
        221,
        114,
        145,
        190
      ],
      "accounts": [
        {
          "name": "platform",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "platform.total_projects",
                "account": "platform"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "dev",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createProjectParams"
            }
          }
        }
      ]
    },
    {
      "name": "emitHealthCheck",
      "discriminator": [
        185,
        42,
        207,
        133,
        218,
        123,
        79,
        236
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "finalizeFunding",
      "discriminator": [
        129,
        81,
        184,
        191,
        58,
        224,
        149,
        90
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initializePlatform",
      "discriminator": [
        119,
        201,
        101,
        45,
        75,
        122,
        89,
        3
      ],
      "accounts": [
        {
          "name": "platform",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "openEconomicPhase",
      "discriminator": [
        104,
        154,
        241,
        150,
        253,
        178,
        67,
        162
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "refund",
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "project",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "contribution",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  105,
                  98,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "contributor"
              }
            ]
          }
        },
        {
          "name": "projectVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "contributor",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "registerDevActivity",
      "discriminator": [
        104,
        13,
        253,
        28,
        22,
        110,
        255,
        222
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "dev",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "triggerInactivity",
      "discriminator": [
        126,
        106,
        29,
        137,
        218,
        194,
        245,
        8
      ],
      "accounts": [
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "contribution",
      "discriminator": [
        182,
        187,
        14,
        111,
        72,
        167,
        242,
        212
      ]
    },
    {
      "name": "platform",
      "discriminator": [
        77,
        92,
        204,
        58,
        187,
        98,
        91,
        12
      ]
    },
    {
      "name": "project",
      "discriminator": [
        205,
        168,
        189,
        202,
        181,
        247,
        142,
        19
      ]
    },
    {
      "name": "socialVote",
      "discriminator": [
        86,
        111,
        34,
        197,
        71,
        130,
        73,
        33
      ]
    }
  ],
  "events": [
    {
      "name": "contributionMade",
      "discriminator": [
        81,
        218,
        72,
        109,
        93,
        96,
        131,
        199
      ]
    },
    {
      "name": "devActivityRegistered",
      "discriminator": [
        146,
        166,
        133,
        240,
        133,
        60,
        92,
        188
      ]
    },
    {
      "name": "devLocked",
      "discriminator": [
        151,
        208,
        132,
        226,
        166,
        33,
        92,
        220
      ]
    },
    {
      "name": "economicPhaseOpened",
      "discriminator": [
        224,
        234,
        153,
        176,
        180,
        211,
        172,
        168
      ]
    },
    {
      "name": "fundingFailed",
      "discriminator": [
        157,
        28,
        229,
        25,
        248,
        253,
        183,
        60
      ]
    },
    {
      "name": "fundingSucceeded",
      "discriminator": [
        52,
        35,
        156,
        31,
        18,
        233,
        47,
        13
      ]
    },
    {
      "name": "healthCheckEmitted",
      "discriminator": [
        174,
        200,
        191,
        198,
        137,
        209,
        28,
        104
      ]
    },
    {
      "name": "projectCreated",
      "discriminator": [
        192,
        10,
        163,
        29,
        185,
        31,
        67,
        168
      ]
    },
    {
      "name": "refundIssued",
      "discriminator": [
        249,
        16,
        159,
        159,
        93,
        186,
        145,
        206
      ]
    },
    {
      "name": "socialPhaseClosed",
      "discriminator": [
        201,
        198,
        244,
        154,
        105,
        253,
        24,
        219
      ]
    },
    {
      "name": "socialVoteCast",
      "discriminator": [
        86,
        85,
        140,
        142,
        181,
        237,
        5,
        119
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "emptyName",
      "msg": "El nombre del proyecto no puede estar vacío"
    },
    {
      "code": 6001,
      "name": "emptyTicker",
      "msg": "El ticker no puede estar vacío"
    },
    {
      "code": 6002,
      "name": "emptyDescription",
      "msg": "La descripción no puede estar vacía"
    },
    {
      "code": 6003,
      "name": "raiseTooLow",
      "msg": "La meta de recaudación es demasiado baja (mínimo $100,000 USD equivalente)"
    },
    {
      "code": 6004,
      "name": "socialVoteNotActive",
      "msg": "La fase de votación social no está activa"
    },
    {
      "code": 6005,
      "name": "alreadyVoted",
      "msg": "Ya votaste en este proyecto"
    },
    {
      "code": 6006,
      "name": "socialVoteNotEnded",
      "msg": "La fase de votación social no ha terminado"
    },
    {
      "code": 6007,
      "name": "economicPhaseNotActive",
      "msg": "La fase económica no está activa"
    },
    {
      "code": 6008,
      "name": "economicPhaseNotEnded",
      "msg": "La fase económica no ha terminado"
    },
    {
      "code": 6009,
      "name": "contributionTooLow",
      "msg": "La contribución mínima es $1 USD equivalente"
    },
    {
      "code": 6010,
      "name": "exceedsHolderLimit",
      "msg": "Esta contribución excede el límite de 0.1% del supply por holder"
    },
    {
      "code": 6011,
      "name": "alreadyContributed",
      "msg": "Ya contribuiste en este proyecto"
    },
    {
      "code": 6012,
      "name": "notEnoughHolders",
      "msg": "El proyecto no alcanzó el mínimo de holders requeridos (1,000)"
    },
    {
      "code": 6013,
      "name": "notEnoughFunds",
      "msg": "El proyecto no alcanzó la meta de recaudación mínima"
    },
    {
      "code": 6014,
      "name": "alreadyFinalized",
      "msg": "El proyecto ya fue finalizado"
    },
    {
      "code": 6015,
      "name": "notFinalized",
      "msg": "El proyecto aún no fue finalizado"
    },
    {
      "code": 6016,
      "name": "vestingNotComplete",
      "msg": "El vesting aún no ha terminado"
    },
    {
      "code": 6017,
      "name": "vestingAlreadyClaimed",
      "msg": "El vesting ya fue reclamado"
    },
    {
      "code": 6018,
      "name": "nothingToRefund",
      "msg": "No hay fondos para reembolsar"
    },
    {
      "code": 6019,
      "name": "projectSucceeded",
      "msg": "El proyecto fue exitoso, no hay reembolso disponible"
    },
    {
      "code": 6020,
      "name": "unauthorizedActivityUpdate",
      "msg": "Solo el dev puede registrar actividad"
    },
    {
      "code": 6021,
      "name": "devLocked",
      "msg": "El dev está bloqueado por inactividad"
    },
    {
      "code": 6022,
      "name": "arithmeticOverflow",
      "msg": "Overflow aritmético"
    },
    {
      "code": 6023,
      "name": "invalidProjectState",
      "msg": "El proyecto no existe en el estado esperado"
    },
    {
      "code": 6024,
      "name": "unauthorized",
      "msg": "Solo el administrador de la plataforma puede ejecutar esto"
    }
  ],
  "types": [
    {
      "name": "contribution",
      "docs": [
        "Registra la contribución de un holder en un proyecto específico.",
        "PDA derivada de [CONTRIBUTION_SEED, project_id, contributor_pubkey]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "docs": [
              "Proyecto al que pertenece"
            ],
            "type": "u64"
          },
          {
            "name": "contributor",
            "docs": [
              "Wallet del contribuidor"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountLamports",
            "docs": [
              "Cantidad aportada en lamports"
            ],
            "type": "u64"
          },
          {
            "name": "tokensAllocated",
            "docs": [
              "Tokens asignados en proporción al aporte"
            ],
            "type": "u64"
          },
          {
            "name": "claimed",
            "docs": [
              "Si ya reclamó sus tokens post-vesting"
            ],
            "type": "bool"
          },
          {
            "name": "refunded",
            "docs": [
              "Si ya fue reembolsado (en caso de proyecto fallido)"
            ],
            "type": "bool"
          },
          {
            "name": "contributedAt",
            "docs": [
              "Timestamp de la contribución"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump del PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "contributionMade",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "amountLamports",
            "type": "u64"
          },
          {
            "name": "tokensAllocated",
            "type": "u64"
          },
          {
            "name": "totalRaised",
            "type": "u64"
          },
          {
            "name": "holderCount",
            "type": "u64"
          },
          {
            "name": "platformFee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "createProjectParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "ticker",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "websiteUrl",
            "type": "string"
          },
          {
            "name": "raiseGoal",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "devActivityRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "dev",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "devLocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "dev",
            "type": "pubkey"
          },
          {
            "name": "inactiveForDays",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "economicPhaseOpened",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "openedAt",
            "type": "i64"
          },
          {
            "name": "vestingEnd",
            "type": "i64"
          },
          {
            "name": "socialVotesAtOpening",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "fundingFailed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "totalRaised",
            "type": "u64"
          },
          {
            "name": "holderCount",
            "type": "u64"
          },
          {
            "name": "holdersOk",
            "type": "bool"
          },
          {
            "name": "minRaiseOk",
            "type": "bool"
          },
          {
            "name": "goalOk",
            "type": "bool"
          },
          {
            "name": "failedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "fundingSucceeded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "totalRaised",
            "type": "u64"
          },
          {
            "name": "holderCount",
            "type": "u64"
          },
          {
            "name": "graduatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "healthCheckEmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "checkNumber",
            "type": "u8"
          },
          {
            "name": "totalRaised",
            "type": "u64"
          },
          {
            "name": "targetAmount",
            "type": "u64"
          },
          {
            "name": "holderCount",
            "type": "u64"
          },
          {
            "name": "onTrack",
            "type": "bool"
          },
          {
            "name": "checkedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "platform",
      "docs": [
        "Estado global de la plataforma Quorum.",
        "Un único PDA controla la configuración y tesorería."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Administrador con capacidad de actualizar parámetros"
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "Wallet donde van las fees de la plataforma"
            ],
            "type": "pubkey"
          },
          {
            "name": "totalProjects",
            "docs": [
              "Total de proyectos creados (sirve como nonce para PDAs)"
            ],
            "type": "u64"
          },
          {
            "name": "totalFeesCollected",
            "docs": [
              "Total acumulado en fees (en lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump del PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "project",
      "docs": [
        "Datos principales de un proyecto en Quorum."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dev",
            "docs": [
              "Wallet del creador del proyecto"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "docs": [
              "Mint del token SPL creado para este proyecto"
            ],
            "type": "pubkey"
          },
          {
            "name": "projectId",
            "docs": [
              "ID único del proyecto (índice secuencial)"
            ],
            "type": "u64"
          },
          {
            "name": "name",
            "docs": [
              "Nombre del proyecto"
            ],
            "type": "string"
          },
          {
            "name": "ticker",
            "docs": [
              "Ticker del token (ej: \"QRMD\")"
            ],
            "type": "string"
          },
          {
            "name": "description",
            "docs": [
              "Descripción de la utilidad del proyecto"
            ],
            "type": "string"
          },
          {
            "name": "websiteUrl",
            "docs": [
              "URL del sitio web o repositorio"
            ],
            "type": "string"
          },
          {
            "name": "state",
            "docs": [
              "Estado actual del proyecto"
            ],
            "type": {
              "defined": {
                "name": "projectState"
              }
            }
          },
          {
            "name": "socialVoteStart",
            "docs": [
              "Timestamp de inicio de la votación social (Día 1)"
            ],
            "type": "i64"
          },
          {
            "name": "socialVotes",
            "docs": [
              "Total de votos sociales recibidos"
            ],
            "type": "u64"
          },
          {
            "name": "economicPhaseActive",
            "docs": [
              "Si la fase económica ya está abierta",
              "Puede ser true mientras la social sigue activa (Día 15+)"
            ],
            "type": "bool"
          },
          {
            "name": "economicPhaseOpen",
            "docs": [
              "Timestamp en que abrió la fase económica (Día 15)"
            ],
            "type": "i64"
          },
          {
            "name": "raiseGoal",
            "docs": [
              "Meta de recaudación definida por el dev (en lamports)",
              "Debe ser >= MIN_RAISE_LAMPORTS ($100,000 USD equiv.)"
            ],
            "type": "u64"
          },
          {
            "name": "totalRaised",
            "docs": [
              "Total recaudado hasta el momento (en lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "holderCount",
            "docs": [
              "Número de contribuidores únicos (holders)"
            ],
            "type": "u64"
          },
          {
            "name": "platformFeePaid",
            "docs": [
              "Fee ya cobrada por la plataforma (en lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "healthCheck1Emitted",
            "docs": [
              "Si ya se emitió el health check del Mes 3"
            ],
            "type": "bool"
          },
          {
            "name": "healthCheck2Emitted",
            "docs": [
              "Si ya se emitió el health check del Mes 6"
            ],
            "type": "bool"
          },
          {
            "name": "vestingStart",
            "docs": [
              "Timestamp en que empieza el vesting (= economic_phase_open)"
            ],
            "type": "i64"
          },
          {
            "name": "vestingEnd",
            "docs": [
              "Timestamp en que termina el vesting y se evalúa la graduación (Día 284)"
            ],
            "type": "i64"
          },
          {
            "name": "lastDevActivity",
            "docs": [
              "Último timestamp de actividad registrada del dev"
            ],
            "type": "i64"
          },
          {
            "name": "devLocked",
            "docs": [
              "Si el dev está bloqueado por inactividad (60 días sin actividad)"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "Bump del PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "projectCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "dev",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "ticker",
            "type": "string"
          },
          {
            "name": "raiseGoal",
            "type": "u64"
          },
          {
            "name": "socialVoteStart",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "projectState",
      "docs": [
        "Estados del ciclo de vida de un proyecto"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "socialVoting"
          },
          {
            "name": "economicPhase"
          },
          {
            "name": "vesting"
          },
          {
            "name": "failed"
          },
          {
            "name": "graduated"
          }
        ]
      }
    },
    {
      "name": "refundIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "refundAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "socialPhaseClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "finalVotes",
            "type": "u64"
          },
          {
            "name": "closedAt",
            "type": "i64"
          },
          {
            "name": "economicPhaseActive",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "socialVote",
      "docs": [
        "Registra el voto social de una wallet en un proyecto.",
        "Previene votar dos veces desde la misma wallet.",
        "PDA derivada de [VOTE_SEED, project_id, voter_pubkey]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "docs": [
              "Proyecto votado"
            ],
            "type": "u64"
          },
          {
            "name": "voter",
            "docs": [
              "Wallet que votó"
            ],
            "type": "pubkey"
          },
          {
            "name": "votedAt",
            "docs": [
              "Timestamp del voto"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump del PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "socialVoteCast",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "projectId",
            "type": "u64"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "totalVotes",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
