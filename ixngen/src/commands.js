import Ajv from 'ajv';
import logger from './logUtil';
const log = logger.getInstance();

// NOTE: mutates the cmds parameter by adding default values
export const verifyAndFillDefaults = (cmds) => {
  const schema = {
    type: "array",
    items: {
      type: "object",
      required: ["id", "parties"],
      properties: {
        id: {
          type: "string"
        },
        name: {
          type: "string"
        },
        parties: {
          type: "array",
          items: {
            type: "object",
            required: ["identity", "steps"],
            properties: {
              identity: {type: "string"},
              steps: {
                type: "array",
                items: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    action: {
                      type: "string",
                      enum: ["accept", "activity", "attach", "complete", "dial", "hold", "release", "transfer", "twiml", "unhold"]
                    }
                  },
                  additionalProperties: {
                    after: {type: "string"},
                    wait: {type: "number", default: 0}
                  },
                  allOf: [
                    {
                      if: {
                        properties: { action: { const: "activity" } }
                      },
                      then: {
                        properties: {
                          name: {
                            type: "string",
                            enum: ["Busy", "Available", "Lunch", "Break", "Offline"]
                          }
                        },
                        required: ["name"]
                      }
                    },
                    {
                      if: {
                        properties: { action: { const: "dial" } }
                      },
                      then: {
                        properties: {
                          from: {type: "string", pattern: "[+]{1}1[0-9]{10}$"},
                          to: {type: "string", pattern: "[+]{1}1[0-9]{10}$"},
                          twiml: {type: "string"},
                          data: {type: "object"}
                        },
                        required: ["to", "from"]
                      }
                    },
                    {
                      if: {
                        properties: { action: { const: "attach" } }
                      },
                      then: {
                        properties: {
                          data: {type: "string"}
                        },
                        required: ["data"]
                      }
                    },
                    {
                      if: {
                        properties: { action: { const: "transfer" } }
                      },
                      then: {
                        properties: {
                          targetType: {type: "string"},
                          targetName: {type: "string"},
                          mode: {type: "string"},
                        },
                        required: ["targetType", "targetName", "mode"]
                      }
                    },
                    {
                      if: {
                        properties: { action: { const: "twiml" } }
                      },
                      then: {
                        properties: {
                          request: {type: "number"},
                          response: {type: "string"}
                        },
                        required: ["request", "response"]
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  };
  const ajv = new Ajv({ useDefaults: true });
  const validate = ajv.compile(schema);
  const valid = validate(cmds);
  if (!valid)
    log.error(validate.errors);
  return valid;
}
