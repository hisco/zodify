const metadata = {
  name: 'User',
  properties: [
    { name: 'name', type: 'string', optional: false, nullable: false }
  ],
  nestedClasses: []
};

function generateClassConstructor(metadata) {
  const properties = metadata.properties
    .map((prop) => {
      const optional = prop.optional ? '?' : '';
      const nullable = prop.nullable ? ' | null' : '';
      return `  ${prop.name}${optional}: ${prop.type}${nullable};`;
    })
    .join('\n');

  const code = `
    return class ${metadata.name} {
${properties}

      constructor(data) {
        if (data) {
          Object.assign(this, data);
        }
      }
    }
  `;
  
  console.log('Generated code:');
  console.log(code);
  console.log('---');
  
  return code;
}

const classCode = generateClassConstructor(metadata);
try {
  const ClassConstructor = new Function('nestedClasses', classCode)({});
  console.log('Success!', ClassConstructor);
} catch (e) {
  console.error('Error:', e.message);
}
