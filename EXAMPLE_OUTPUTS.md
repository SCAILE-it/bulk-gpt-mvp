# 📋 Example Output Files

## What Results Look Like After Processing

When users upload a CSV and process it through Bulk GPT, they get results in two formats:

---

## 📊 Example 1: CSV Export

### Input (sample.csv)
```
name,company,role
Alice Johnson,TechCorp,Senior Engineer
Bob Smith,DataCo,Data Analyst
Carol White,AILabs,Product Manager
```

### Prompt Used
```
Write a professional bio for {{name}} who works as a {{role}} at {{company}}. 
Keep it to 2-3 sentences. Focus on professional achievements.
```

### Output (bulk-gpt-export-2025-10-17.csv)
```
# Batch ID: batch_1729177200000_abc12def
# Exported at: 2025-10-17T10:20:00.000Z
name,company,role,output,status
Alice Johnson,TechCorp,Senior Engineer,"Alice Johnson is an accomplished Senior Engineer at TechCorp with a proven track record of designing and implementing scalable systems. With expertise in cloud architecture and distributed systems, she has led multiple high-impact projects from conception to production. Her technical leadership and mentoring abilities have been instrumental in building high-performing engineering teams.",success
Bob Smith,DataCo,Data Analyst,"Bob Smith is a skilled Data Analyst at DataCo specializing in business intelligence and predictive analytics. He excels at translating complex datasets into actionable insights that drive strategic business decisions. His proficiency in SQL, Python, and data visualization tools has consistently delivered measurable value to the organization.",success
Carol White,AILabs,Product Manager,"Carol White is an innovative Product Manager at AILabs focused on bringing cutting-edge AI solutions to market. She combines technical acumen with strategic vision to oversee product roadmaps that align with both customer needs and business objectives. Her cross-functional leadership has successfully launched products that have achieved significant market adoption.",success
```

---

## 📄 Example 2: JSON Export

### Output (bulk-gpt-export-2025-10-17.json)
```json
{
  "results": [
    {
      "id": "batch_1729177200000_abc12def-row-0",
      "name": "Alice Johnson",
      "company": "TechCorp",
      "role": "Senior Engineer",
      "output": "Alice Johnson is an accomplished Senior Engineer at TechCorp with a proven track record of designing and implementing scalable systems. With expertise in cloud architecture and distributed systems, she has led multiple high-impact projects from conception to production. Her technical leadership and mentoring abilities have been instrumental in building high-performing engineering teams.",
      "status": "success"
    },
    {
      "id": "batch_1729177200000_abc12def-row-1",
      "name": "Bob Smith",
      "company": "DataCo",
      "role": "Data Analyst",
      "output": "Bob Smith is a skilled Data Analyst at DataCo specializing in business intelligence and predictive analytics. He excels at translating complex datasets into actionable insights that drive strategic business decisions. His proficiency in SQL, Python, and data visualization tools has consistently delivered measurable value to the organization.",
      "status": "success"
    },
    {
      "id": "batch_1729177200000_abc12def-row-2",
      "name": "Carol White",
      "company": "AILabs",
      "role": "Product Manager",
      "output": "Carol White is an innovative Product Manager at AILabs focused on bringing cutting-edge AI solutions to market. She combines technical acumen with strategic vision to oversee product roadmaps that align with both customer needs and business objectives. Her cross-functional leadership has successfully launched products that have achieved significant market adoption.",
      "status": "success"
    }
  ],
  "metadata": {
    "batchId": "batch_1729177200000_abc12def",
    "timestamp": "2025-10-17T10:20:00.000Z",
    "totalRows": 3,
    "successfulRows": 3,
    "failedRows": 0,
    "processingTimeMs": 4250
  },
  "exportedAt": "2025-10-17T10:21:35.500Z"
}
```

---

## 📊 Example 3: Larger Batch with Mixed Results

### Input (companies.csv) - 5 rows
```
company_name,industry,founded_year,employee_count
TechVentures,Software,2018,150
FinanceHub,Finance,2010,500
HealthPlus,Healthcare,2015,200
RetailMax,Retail,2012,1000
EdTech Pro,Education,2019,75
```

### Prompt
```
Provide a brief company summary for {{company_name}} in the {{industry}} industry. 
Include founding year and employee size context. 3 sentences max.
```

### Output (bulk-gpt-export-2025-10-17-large.csv)
```
# Batch ID: batch_1729177300000_xyz99abc
# Exported at: 2025-10-17T10:25:00.000Z
company_name,industry,founded_year,employee_count,output,status
TechVentures,Software,2018,150,"TechVentures is a dynamic software company founded in 2018 with a focused team of 150 talented engineers and developers. The company specializes in building innovative SaaS solutions for enterprise clients. With rapid growth and strong market traction, TechVentures has established itself as an emerging leader in the software space.",success
FinanceHub,Finance,2010,500,"FinanceHub is an established financial services firm founded in 2010 that has grown to over 500 employees across multiple offices. The company provides comprehensive wealth management and investment solutions to institutional and individual clients. Their long track record and market expertise position them as a trusted partner in the financial industry.",success
HealthPlus,Healthcare,2015,200,"HealthPlus is a healthcare technology company founded in 2015 with a committed team of 200 professionals. They develop innovative digital health solutions that improve patient outcomes and streamline clinical workflows. Their commitment to healthcare innovation has earned them recognition as a rising player in the health tech sector.",success
RetailMax,Retail,2012,1000,"RetailMax is a large retail enterprise founded in 2012 that has grown to 1,000+ employees across multiple locations. The company operates a multi-channel retail platform serving millions of customers nationwide. Their scale and operational efficiency have made them a significant force in the retail industry.",success
EdTech Pro,Education,2019,75,"EdTech Pro is a nimble education technology startup founded in 2019 with a lean team of 75 dedicated professionals. They create engaging online learning platforms that make quality education accessible to students worldwide. Despite their recent founding, EdTech Pro has quickly gained traction in the competitive ed-tech market.",success
```

---

## 🔴 Example 4: Results with Errors

### Input (problematic.csv)
```
product_code,price,category
PROD001,29.99,Electronics
PROD002,invalid_price,Software
PROD003,,Home
```

### Output (bulk-gpt-export-2025-10-17-errors.csv)
```
# Batch ID: batch_1729177400000_err55def
# Exported at: 2025-10-17T10:30:00.000Z
product_code,price,category,output,status,error
PROD001,29.99,Electronics,"Product PROD001: A premium electronics item priced at $29.99, representing excellent value in its category.",success,
PROD002,invalid_price,Software,"",error,"Price validation failed: 'invalid_price' is not a valid decimal number"
PROD003,,Home,"",error,"Price field is required but was empty"
```

**Summary**: 1 success, 2 errors (33% success rate)

---

## 📥 How Users Download

### In the UI:
1. Process completes ✅
2. Results table shows all rows ✅
3. **"📥 Download Results" section appears**
4. Two buttons:
   - **Download as CSV** → `bulk-gpt-[batchId].csv`
   - **Download as JSON** → `bulk-gpt-[batchId].json`
5. Click → Browser downloads file immediately

### Files Include:
- ✅ Original CSV columns
- ✅ AI-generated output (one per row)
- ✅ Status (success/error)
- ✅ Error messages (if failed)
- ✅ Metadata (batch ID, timestamp, etc.)

---

## 🎯 Use Cases

### CSV Export Good For:
- Excel/Sheets analysis
- Quick data imports
- Human-friendly review
- Comments and metadata in header

### JSON Export Good For:
- API integrations
- Data pipelines
- Structured parsing
- Full metadata preservation

---

**All exports are instantly available after processing completes.**

