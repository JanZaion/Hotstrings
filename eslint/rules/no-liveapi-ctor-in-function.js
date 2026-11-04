const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow constructing LiveAPI inside functions',
    },
    schema: [],
    messages: {
      noConstructInFunction:
        '`LiveAPI` must be constructed at module scope and reused. Do not construct it inside a function.',
    },
  },
  create(context) {
    return {
      ':function NewExpression'(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'LiveAPI') {
          return;
        }

        context.report({
          node,
          messageId: 'noConstructInFunction',
        });
      },
    };
  },
};

export default rule;
