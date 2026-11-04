const DEFAULT_CONSTRUCTORS = ['LiveAPI', 'File'];

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow constructing Max/Live objects inside functions',
    },
    schema: [
      {
        type: 'object',
        properties: {
          constructors: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noConstructInFunction:
        '`{{name}}` must be constructed at module scope and reused. Do not construct it inside a function.',
    },
  },
  create(context) {
    const constructors = new Set(context.options[0]?.constructors ?? DEFAULT_CONSTRUCTORS);

    return {
      ':function NewExpression'(node) {
        if (node.callee.type !== 'Identifier') {
          return;
        }

        const name = node.callee.name;
        if (!constructors.has(name)) {
          return;
        }

        context.report({
          node,
          messageId: 'noConstructInFunction',
          data: { name },
        });
      },
    };
  },
};

export default rule;
