import React from 'react';

interface TestCase {
  _id: string;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'pending';
  type: string;
  projectId: string;
}

interface TestingSectionProps {
  testCases: TestCase[];
  onUpdate: (id: string, data: Partial<TestCase>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Omit<TestCase, '_id'>) => void;
}

export const TestingSection: React.FC<TestingSectionProps> = ({
  testCases,
  onUpdate,
  onDelete,
  onCreate
}) => {
  const [newTest, setNewTest] = React.useState<Partial<TestCase>>({});

  const handleCreate = () => {
    if (newTest.name) {
      onCreate({
        name: newTest.name,
        description: newTest.description || '',
        status: (newTest.status as 'passed' | 'failed' | 'pending') || 'pending',
        type: newTest.type || 'Unit Test',
        projectId: ''
      });
      setNewTest({});
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: testCases.length,
    passed: testCases.filter(t => t.status === 'passed').length,
    failed: testCases.filter(t => t.status === 'failed').length,
    pending: testCases.filter(t => t.status === 'pending').length
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-6">Testing</h2>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-600">Total Tests</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-sm text-green-600">Passed</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
        </div>

        {/* Create New Test */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-3">Create New Test</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Test Name"
              value={newTest.name || ''}
              onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newTest.type || 'Unit Test'}
              onChange={(e) => setNewTest({ ...newTest, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Unit Test">Unit Test</option>
              <option value="Integration Test">Integration Test</option>
              <option value="E2E Test">E2E Test</option>
              <option value="Performance Test">Performance Test</option>
            </select>
            <select
              value={newTest.status || 'pending'}
              onChange={(e) => setNewTest({ ...newTest, status: e.target.value as 'passed' | 'failed' | 'pending' })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <textarea
            placeholder="Test Description"
            value={newTest.description || ''}
            onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
            className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <button
            onClick={handleCreate}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Test
          </button>
        </div>

        {/* Tests Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testCases.map((test) => (
                <tr key={test._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {test.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {test.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(test.status)}`}>
                      {test.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {test.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onUpdate(test._id, { 
                        status: test.status === 'passed' ? 'failed' : 'passed' 
                      })}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Toggle Status
                    </button>
                    <button
                      onClick={() => onDelete(test._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
