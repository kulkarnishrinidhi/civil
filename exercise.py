import xlrd
import re
import sys

path = "new.xls"
workbook = xlrd.open_workbook(path)
# Get workbook active sheet object
# from the active attribute
# workbook = wb_obj.active
sheet1 = workbook.sheet_by_index(0)


# Define Class and Attributes
class Node:
  def __init__(self, activity):
    self.activity=activity
    self.duration=None
    self.ES = None
    self.EF = None
    self.LS = None
    self.LF = None

    self.next = set()
    self.prev = set()

# build flow
node_dict = {}
for x in range(sheet1.nrows):
 print(sheet1.row_values(x))
 activity = sheet1.cell_value(x,0)
 node = node_dict.get(activity)
 if(node == None):
     node = Node(activity)
     node_dict[activity] = node
 node.duration = sheet1.cell_value(x,1)

 depends = re.compile("[, -]+").split(sheet1.cell_value(x,2))
 for i in depends:
     if(i != ""):
        node_prev = node_dict.get(i)
        if(node_prev == None):
            node_prev = Node(i)
            node_dict[i] = node_prev
        node.prev.add(node_prev)
        node_prev.next.add(node)

# find start and end
start = Node("start")
start.ES = 0
start.EF = 0
start.LS = 0
start.LF = 0
start.duration = 0
end = Node("end")
end.duration = 0
for activity in node_dict:
    node = node_dict[activity]
    if(len(node.prev) == 0):
        start.next.add(node)
        node.prev.add(start)
    if(len(node.next) == 0):
        end.prev.add(node)
        node.next.add(end)

# foward
def foward(node):
    max = 0
    for prev in node.prev:
        if(prev.EF == None):
            foward(prev)
        if(prev.EF > max):
            max = prev.EF
    node.ES = max
    node.EF = node.ES + node.duration

# backward
def backward(node):
    min = sys.maxsize
    for next in node.next:
        if(next.LS == None):
            backward(next)
        if(next.LS < min):
            min = next.LS

    if(len(node.next) == 0):
        min = node.EF
    node.LF = min
    node.LS = node.LF - node.duration

foward(end)
end.LS = end.ES
end.EF = end.ES
end.LF = end.ES
backward(start)
show_flow()
