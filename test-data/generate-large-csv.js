/**
 * Generate large CSV files for stress testing
 * Creates CSV files with 1000+ rows for performance testing
 */

const fs = require('fs');
const path = require('path');

// Generate large products CSV (1000 rows)
function generateLargeProducts(count = 1000) {
  const headers = 'name,description,price,category,stock,sku,weight_kg,dimensions\n';
  const categories = ['Electronics', 'Furniture', 'Accessories', 'Software', 'Books'];
  const products = [];
  
  for (let i = 1; i <= count; i++) {
    const category = categories[i % categories.length];
    const name = `Product ${i}`;
    const description = `High-quality ${category.toLowerCase()} product number ${i} with excellent features and reliable performance.`;
    const price = (Math.random() * 500 + 10).toFixed(2);
    const stock = Math.floor(Math.random() * 500);
    const sku = `SKU-${String(i).padStart(6, '0')}`;
    const weight = (Math.random() * 10).toFixed(2);
    const dimensions = `${Math.floor(Math.random() * 100 + 10)}x${Math.floor(Math.random() * 100 + 10)}x${Math.floor(Math.random() * 50 + 5)} cm`;
    
    products.push(`"${name}","${description}",${price},${category},${stock},${sku},${weight},"${dimensions}"`);
  }
  
  return headers + products.join('\n');
}

// Generate large employees CSV (1000 rows)
function generateLargeEmployees(count = 1000) {
  const headers = 'first_name,last_name,email,department,role,years_experience\n';
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
  const roles = ['Developer', 'Manager', 'Analyst', 'Designer', 'Engineer', 'Specialist'];
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa', 'Tom', 'Anna'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  const employees = [];
  
  for (let i = 1; i <= count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`;
    const department = departments[i % departments.length];
    const role = roles[i % roles.length];
    const yearsExp = Math.floor(Math.random() * 15 + 1);
    
    employees.push(`"${firstName}","${lastName}","${email}",${department},${role},${yearsExp}`);
  }
  
  return headers + employees.join('\n');
}

// Generate large customers CSV (1000 rows)
function generateLargeCustomers(count = 1000) {
  const headers = 'customer_id,name,email,phone,address,city,country,registration_date\n';
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
  const countries = ['USA', 'Canada', 'UK', 'Germany', 'France', 'Spain', 'Italy', 'Australia', 'Japan', 'Brazil'];
  const firstNames = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
  const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  const customers = [];
  
  for (let i = 1; i <= count; i++) {
    const customerId = `C${String(i).padStart(6, '0')}`;
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`;
    const phone = `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const address = `${Math.floor(Math.random() * 9999 + 1)} Main St`;
    const city = cities[i % cities.length];
    const country = countries[i % countries.length];
    const year = 2023;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    customers.push(`"${customerId}","${name}","${email}","${phone}","${address}",${city},${country},"${date}"`);
  }
  
  return headers + customers.join('\n');
}

// Generate minimal large CSV (1000 rows, 2 columns)
function generateLargeMinimal(count = 1000) {
  const headers = 'id,name\n';
  const names = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
  
  const rows = [];
  for (let i = 1; i <= count; i++) {
    const name = `${names[i % names.length]} ${i}`;
    rows.push(`${i},"${name}"`);
  }
  
  return headers + rows.join('\n');
}

// Main execution
const testDataDir = path.join(__dirname);

console.log('Generating large CSV files for stress testing...\n');

// Generate files
const files = [
  { name: 'products-1000.csv', content: generateLargeProducts(1000), description: '1000 products' },
  { name: 'products-5000.csv', content: generateLargeProducts(5000), description: '5000 products' },
  { name: 'employees-1000.csv', content: generateLargeEmployees(1000), description: '1000 employees' },
  { name: 'customers-1000.csv', content: generateLargeCustomers(1000), description: '1000 customers' },
  { name: 'minimal-1000.csv', content: generateLargeMinimal(1000), description: '1000 rows minimal' },
  { name: 'minimal-10000.csv', content: generateLargeMinimal(10000), description: '10000 rows minimal' },
];

files.forEach(file => {
  const filePath = path.join(testDataDir, file.name);
  fs.writeFileSync(filePath, file.content, 'utf-8');
  const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(2);
  const rowCount = file.content.split('\n').length - 1; // Subtract header
  console.log(`✓ Created ${file.name}: ${rowCount} rows, ${sizeKB} KB`);
});

console.log('\n✅ All large CSV files generated successfully!');
console.log('\nFiles created:');
files.forEach(file => {
  console.log(`  - ${file.name} (${file.description})`);
});


